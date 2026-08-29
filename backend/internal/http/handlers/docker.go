package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	dockerclient "github.com/docker/docker/client"
	"github.com/go-chi/chi/v5"

	"github.com/ipetinate/glass-stack/backend/internal/containers"
	"github.com/ipetinate/glass-stack/backend/internal/docker"
	"github.com/ipetinate/glass-stack/backend/internal/events"
	"github.com/ipetinate/glass-stack/backend/internal/observability"
)

var errInvalidTail = errors.New("parâmetro tail deve ser um número não negativo")

// EngineService is the read surface the docker routes depend on. It is
// implemented by containers.Service.
type EngineService interface {
	Status(context.Context) docker.EngineStatus
	List(context.Context) ([]docker.ContainerRecord, error)
}

// ContainerOperations extends EngineService with per-container read, control
// and log operations implemented by containers.Service.
type ContainerOperations interface {
	EngineService
	Detail(context.Context, string) (docker.ContainerDetail, error)
	Lifecycle(context.Context, containers.LifecycleAction, string) error
	Logs(context.Context, string, docker.LogQuery) ([]docker.LogLine, error)
	StreamLogs(context.Context, string, docker.LogQuery, func(docker.LogLine) error) error
	Stats(context.Context, string) (docker.ContainerStats, error)
	StreamEvents(context.Context, func(docker.EventMessage) error) error
}

// DockerStatus reports engine reachability, version, capabilities, and
// container counts. It is safe to poll frequently; it never errors.
func DockerStatus(service EngineService) http.HandlerFunc {
	return func(response http.ResponseWriter, request *http.Request) {
		writeJSON(response, http.StatusOK, service.Status(request.Context()))
	}
}

// ContainersList returns the normalized container inventory.
func ContainersList(service EngineService) http.HandlerFunc {
	return func(response http.ResponseWriter, request *http.Request) {
		records, err := service.List(request.Context())
		if err != nil {
			writeDockerError(
				response,
				request,
				http.StatusServiceUnavailable,
				"docker_unreachable",
				"Docker não está acessível. Verifique se o engine está em execução.",
			)
			return
		}
		if records == nil {
			records = []docker.ContainerRecord{}
		}
		writeJSON(response, http.StatusOK, map[string]any{
			"data":  records,
			"total": len(records),
		})
	}
}

func writeDockerError(
	response http.ResponseWriter,
	request *http.Request,
	status int,
	code string,
	message string,
) {
	response.Header().Set("Content-Type", "application/json")
	response.WriteHeader(status)
	_ = json.NewEncoder(response).Encode(map[string]any{
		"code":      code,
		"message":   message,
		"requestId": observability.RequestID(request.Context()),
	})
}

// ContainerDetail returns the normalized inspection of one container, with
// sensitive environment values redacted.
func ContainerDetail(service ContainerOperations) http.HandlerFunc {
	return func(response http.ResponseWriter, request *http.Request) {
		id := chi.URLParam(request, "id")
		detail, err := service.Detail(request.Context(), id)
		if err != nil {
			writeContainerQueryError(response, request, err)
			return
		}
		detail.Environment = redactedEnvironment(detail.Environment)
		writeJSON(response, http.StatusOK, map[string]any{"data": detail})
	}
}

// ContainerLifecycle applies a start/stop/restart action to a container. Each
// invocation is an audited mutation.
func ContainerLifecycle(
	service ContainerOperations,
	action containers.LifecycleAction,
) http.HandlerFunc {
	return func(response http.ResponseWriter, request *http.Request) {
		id := chi.URLParam(request, "id")
		if err := service.Lifecycle(request.Context(), action, id); err != nil {
			writeContainerQueryError(response, request, err)
			return
		}
		writeJSON(response, http.StatusAccepted, map[string]any{
			"id":     id,
			"action": string(action),
			"status": "requested",
		})
	}
}

// ContainerLogs returns recent log lines as JSON, or streams them over SSE
// when ?follow=true.
func ContainerLogs(service ContainerOperations) http.HandlerFunc {
	return func(response http.ResponseWriter, request *http.Request) {
		id := chi.URLParam(request, "id")
		query, err := logQueryFromRequest(request)
		if err != nil {
			writeDockerError(
				response,
				request,
				http.StatusBadRequest,
				"invalid_input",
				err.Error(),
			)
			return
		}
		if query.Follow {
			streamContainerLogs(response, request, service, id, query)
			return
		}
		lines, err := service.Logs(request.Context(), id, query)
		if err != nil {
			writeContainerQueryError(response, request, err)
			return
		}
		if lines == nil {
			lines = []docker.LogLine{}
		}
		writeJSON(response, http.StatusOK, map[string]any{"data": lines})
	}
}

func logQueryFromRequest(request *http.Request) (docker.LogQuery, error) {
	query := docker.LogQuery{Follow: false}
	if tail := request.URL.Query().Get("tail"); tail != "" {
		value, err := strconv.Atoi(tail)
		if err != nil || value < 0 {
			return query, errInvalidTail
		}
		query.Tail = value
	}
	if follow := request.URL.Query().Get("follow"); follow == "true" || follow == "1" {
		query.Follow = true
	}
	return query, nil
}

func streamContainerLogs(
	response http.ResponseWriter,
	request *http.Request,
	service ContainerOperations,
	id string,
	query docker.LogQuery,
) {
	flusher, ok := response.(http.Flusher)
	if !ok {
		writeDockerError(
			response,
			request,
			http.StatusInternalServerError,
			"streaming_unsupported",
			"Streaming não é suportado pela conexão atual.",
		)
		return
	}
	response.Header().Set("Content-Type", "text/event-stream")
	response.Header().Set("Cache-Control", "no-cache")
	response.Header().Set("Connection", "keep-alive")
	flusher.Flush()

	var sequence uint64
	emit := func(line docker.LogLine) bool {
		sequence++
		return writeSSE(response, flusher, events.Event{
			ID:         strconv.FormatUint(sequence, 10),
			Type:       "container.log",
			OccurredAt: time.Now().UTC(),
			Payload:    line,
		})
	}

	_ = service.StreamLogs(
		request.Context(),
		id,
		query,
		func(line docker.LogLine) error {
			if !emit(line) {
				return context.Canceled
			}
			return nil
		},
	)
}

func writeContainerQueryError(
	response http.ResponseWriter,
	request *http.Request,
	err error,
) {
	switch {
	case dockerclient.IsErrNotFound(err):
		writeDockerError(
			response,
			request,
			http.StatusNotFound,
			"container_not_found",
			"O container não existe ou foi removido.",
		)
	case dockerclient.IsErrConnectionFailed(err):
		writeDockerError(
			response,
			request,
			http.StatusServiceUnavailable,
			"docker_unreachable",
			"Docker não está acessível. Verifique se o engine está em execução.",
		)
	default:
		writeDockerError(
			response,
			request,
			http.StatusInternalServerError,
			"container_error",
			err.Error(),
		)
	}
}

// ContainerStats returns a point-in-time resource snapshot for one container.
func ContainerStats(service ContainerOperations) http.HandlerFunc {
	return func(response http.ResponseWriter, request *http.Request) {
		id := chi.URLParam(request, "id")
		stats, err := service.Stats(request.Context(), id)
		if err != nil {
			writeContainerQueryError(response, request, err)
			return
		}
		writeJSON(response, http.StatusOK, map[string]any{"data": stats})
	}
}

// DockerEvents streams engine events (container start/stop/die, etc.) over
// SSE until the client disconnects.
func DockerEvents(service ContainerOperations) http.HandlerFunc {
	return func(response http.ResponseWriter, request *http.Request) {
		flusher, ok := response.(http.Flusher)
		if !ok {
			writeDockerError(
				response,
				request,
				http.StatusInternalServerError,
				"streaming_unsupported",
				"Streaming não é suportado pela conexão atual.",
			)
			return
		}
		response.Header().Set("Content-Type", "text/event-stream")
		response.Header().Set("Cache-Control", "no-cache")
		response.Header().Set("Connection", "keep-alive")
		flusher.Flush()

		var sequence uint64
		emit := func(event docker.EventMessage) error {
			sequence++
			if !writeSSE(response, flusher, events.Event{
				ID:         strconv.FormatUint(sequence, 10),
				Type:       "docker.event",
				OccurredAt: time.Now().UTC(),
				Payload:    event,
			}) {
				return context.Canceled
			}
			return nil
		}
		_ = service.StreamEvents(request.Context(), emit)
	}
}

// redactedEnvironment hides sensitive variable values (keys, tokens, secrets)
// before any environment is returned to the UI.
func redactedEnvironment(environment []string) []string {
	redacted := make([]string, 0, len(environment))
	for _, entry := range environment {
		key, value, found := strings.Cut(entry, "=")
		if !found {
			continue
		}
		if isSensitiveKey(key) && value != "" {
			value = "***"
		}
		redacted = append(redacted, key+"="+value)
	}
	return redacted
}

func isSensitiveKey(key string) bool {
	lower := strings.ToLower(key)
	for _, marker := range []string{
		"password", "passwd", "secret", "token", "apikey", "api_key",
		"accesskey", "access_key", "privatekey", "private_key", "credential",
	} {
		if strings.Contains(lower, marker) {
			return true
		}
	}
	return false
}
