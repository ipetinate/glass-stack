package handlers_test

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/ipetinate/glass-stack/backend/internal/containers"
	"github.com/ipetinate/glass-stack/backend/internal/docker"
	"github.com/ipetinate/glass-stack/backend/internal/http/handlers"
)

type engineServiceStub struct {
	status  docker.EngineStatus
	records []docker.ContainerRecord
	listErr error

	detail       docker.ContainerDetail
	detailErr    error
	lifecycle    *[]string
	lifecycleErr error
	logLines     []docker.LogLine
	logsErr      error
	logQueries   []docker.LogQuery

	stats     docker.ContainerStats
	statsErr  error
	events    []docker.EventMessage
	eventsErr error
}

func (stub engineServiceStub) Status(context.Context) docker.EngineStatus {
	return stub.status
}

func (stub engineServiceStub) List(context.Context) ([]docker.ContainerRecord, error) {
	if stub.listErr != nil {
		return nil, stub.listErr
	}
	return stub.records, nil
}

func (stub engineServiceStub) Detail(_ context.Context, id string) (docker.ContainerDetail, error) {
	if stub.detailErr != nil {
		return docker.ContainerDetail{}, stub.detailErr
	}
	detail := stub.detail
	if id != "" && detail.ID == "" {
		detail.ID = id
	}
	return detail, nil
}

func (stub engineServiceStub) Lifecycle(_ context.Context, action containers.LifecycleAction, _ string) error {
	if stub.lifecycleErr != nil {
		return stub.lifecycleErr
	}
	if stub.lifecycle != nil {
		*stub.lifecycle = append(*stub.lifecycle, string(action))
	}
	return nil
}

func (stub engineServiceStub) Logs(_ context.Context, id string, query docker.LogQuery) ([]docker.LogLine, error) {
	if stub.logsErr != nil {
		return nil, stub.logsErr
	}
	return stub.logLines, nil
}

func (stub engineServiceStub) StreamLogs(
	_ context.Context,
	id string,
	query docker.LogQuery,
	emit func(docker.LogLine) error,
) error {
	if stub.logsErr != nil {
		return stub.logsErr
	}
	for _, line := range stub.logLines {
		if err := emit(line); err != nil {
			return err
		}
	}
	return nil
}

func (stub engineServiceStub) Stats(_ context.Context, id string) (docker.ContainerStats, error) {
	if stub.statsErr != nil {
		return docker.ContainerStats{}, stub.statsErr
	}
	stats := stub.stats
	if id != "" && stats.ID == "" {
		stats.ID = id
	}
	return stats, nil
}

func (stub engineServiceStub) StreamEvents(
	_ context.Context,
	emit func(docker.EventMessage) error,
) error {
	if stub.eventsErr != nil {
		return stub.eventsErr
	}
	for _, event := range stub.events {
		if err := emit(event); err != nil {
			return err
		}
	}
	return nil
}

// notFoundError satisfies the Docker SDK's NotFound contract so the handler
// can map it to a 404 without a real daemon.
type notFoundError struct{}

func (notFoundError) Error() string { return "No such container: abc123" }
func (notFoundError) NotFound()     {}

type errorBody struct {
	Code      string `json:"code"`
	Message   string `json:"message"`
	RequestID string `json:"requestId"`
}

func TestDockerStatusConnected(t *testing.T) {
	server := httptest.NewServer(handlers.DockerStatus(engineServiceStub{
		status: docker.EngineStatus{
			Connected:         true,
			ServerVersion:     "27.4.1",
			APIVersion:        "1.47",
			Architecture:      "x86_64",
			OS:                "linux",
			ComposeAvailable:  true,
			ContainersTotal:   5,
			ContainersRunning: 2,
		},
	}))
	defer server.Close()

	response, err := server.Client().Get(server.URL)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		t.Fatalf("status = %d", response.StatusCode)
	}

	var status docker.EngineStatus
	if err := json.NewDecoder(response.Body).Decode(&status); err != nil {
		t.Fatal(err)
	}
	if !status.Connected || status.ServerVersion != "27.4.1" {
		t.Fatalf("status = %+v", status)
	}
}

func TestDockerStatusDisconnected(t *testing.T) {
	server := httptest.NewServer(handlers.DockerStatus(engineServiceStub{
		status: docker.EngineStatus{
			Connected: false,
			Error:     "unreachable",
		},
	}))
	defer server.Close()

	response, err := server.Client().Get(server.URL)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	var status docker.EngineStatus
	if err := json.NewDecoder(response.Body).Decode(&status); err != nil {
		t.Fatal(err)
	}
	if status.Connected || status.Error != "unreachable" {
		t.Fatalf("status = %+v", status)
	}
}

func TestContainersList(t *testing.T) {
	server := httptest.NewServer(handlers.ContainersList(engineServiceStub{
		records: []docker.ContainerRecord{{
			ID:        "abc123",
			Name:      "uptime-kuma",
			Image:     "louislam/uptime-kuma:1.23.16",
			State:     "running",
			Status:    "Up 2 hours",
			CreatedAt: time.Unix(1700000000, 0).UTC(),
		}},
	}))
	defer server.Close()

	response, err := server.Client().Get(server.URL)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		t.Fatalf("status = %d", response.StatusCode)
	}

	var result struct {
		Data  []docker.ContainerRecord `json:"data"`
		Total int                      `json:"total"`
	}
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}
	if result.Total != 1 || len(result.Data) != 1 || result.Data[0].Name != "uptime-kuma" {
		t.Fatalf("result = %+v", result)
	}
}

func TestContainersListEmpty(t *testing.T) {
	server := httptest.NewServer(handlers.ContainersList(engineServiceStub{}))
	defer server.Close()

	response, err := server.Client().Get(server.URL)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	var result struct {
		Data  []docker.ContainerRecord `json:"data"`
		Total int                      `json:"total"`
	}
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}
	if result.Total != 0 || result.Data == nil || len(result.Data) != 0 {
		t.Fatalf("result = %+v", result)
	}
}

func TestContainersListEngineUnreachable(t *testing.T) {
	server := httptest.NewServer(handlers.ContainersList(engineServiceStub{
		listErr: errors.New("engine unreachable"),
	}))
	defer server.Close()

	response, err := server.Client().Get(server.URL)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusServiceUnavailable {
		t.Fatalf("status = %d", response.StatusCode)
	}

	var body errorBody
	if err := json.NewDecoder(response.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if body.Code != "docker_unreachable" {
		t.Fatalf("body = %+v", body)
	}
	if body.Message == "" {
		t.Fatalf("body = %+v", body)
	}
}

func TestContainerDetail(t *testing.T) {
	server := httptest.NewServer(handlers.ContainerDetail(engineServiceStub{
		detail: docker.ContainerDetail{
			Name:        "uptime-kuma",
			State:       "running",
			Health:      "healthy",
			Image:       "louislam/uptime-kuma:1.23.16",
			IPAddress:   "172.17.0.2",
			Environment: []string{"TOKEN=secret", "PORT=3001"},
		},
	}))
	defer server.Close()

	response, err := server.Client().Get(server.URL + "/api/v1/containers/abc123")
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		t.Fatalf("status = %d", response.StatusCode)
	}
	var result struct {
		Data docker.ContainerDetail `json:"data"`
	}
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}
	if result.Data.Name != "uptime-kuma" || result.Data.Health != "healthy" {
		t.Fatalf("result = %+v", result)
	}
	for _, entry := range result.Data.Environment {
		if strings.HasPrefix(entry, "TOKEN=") && strings.HasSuffix(entry, "secret") {
			t.Fatalf("environment leaked secret value: %q", entry)
		}
		if entry != "TOKEN=***" && entry != "PORT=3001" {
			t.Fatalf("unexpected environment entry: %q", entry)
		}
	}
}

func TestContainerDetailNotFound(t *testing.T) {
	server := httptest.NewServer(handlers.ContainerDetail(engineServiceStub{
		detailErr: notFoundError{},
	}))
	defer server.Close()

	response, err := server.Client().Get(server.URL + "/api/v1/containers/abc123")
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusNotFound {
		t.Fatalf("status = %d", response.StatusCode)
	}
	var body errorBody
	if err := json.NewDecoder(response.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if body.Code != "container_not_found" {
		t.Fatalf("body = %+v", body)
	}
}

func TestContainerLifecycle(t *testing.T) {
	actions := &[]string{}
	server := httptest.NewServer(handlers.ContainerLifecycle(
		engineServiceStub{lifecycle: actions},
		containers.LifecycleStart,
	))
	defer server.Close()

	request, _ := http.NewRequest(http.MethodPost, server.URL+"/api/v1/containers/abc123/start", nil)
	response, err := server.Client().Do(request)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusAccepted {
		t.Fatalf("status = %d", response.StatusCode)
	}
	if got := strings.Join(*actions, ","); got != "start" {
		t.Fatalf("actions = %q", got)
	}
	var body struct {
		Action string `json:"action"`
		Status string `json:"status"`
	}
	if err := json.NewDecoder(response.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if body.Action != "start" || body.Status != "requested" {
		t.Fatalf("body = %+v", body)
	}
}

func TestContainerLifecycleNotFound(t *testing.T) {
	server := httptest.NewServer(handlers.ContainerLifecycle(
		engineServiceStub{lifecycleErr: notFoundError{}},
		containers.LifecycleStop,
	))
	defer server.Close()

	request, _ := http.NewRequest(http.MethodPost, server.URL+"/api/v1/containers/abc123/stop", nil)
	response, err := server.Client().Do(request)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusNotFound {
		t.Fatalf("status = %d", response.StatusCode)
	}
}

func TestContainerLogsRecent(t *testing.T) {
	server := httptest.NewServer(handlers.ContainerLogs(engineServiceStub{
		logLines: []docker.LogLine{
			{Stream: "stdout", Line: "listening on :3001"},
		},
	}))
	defer server.Close()

	response, err := server.Client().Get(server.URL + "/api/v1/containers/abc123/logs?tail=200")
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		t.Fatalf("status = %d", response.StatusCode)
	}
	var result struct {
		Data []docker.LogLine `json:"data"`
	}
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}
	if len(result.Data) != 1 || result.Data[0].Line != "listening on :3001" {
		t.Fatalf("result = %+v", result)
	}
}

func TestContainerLogsInvalidTail(t *testing.T) {
	server := httptest.NewServer(handlers.ContainerLogs(engineServiceStub{}))
	defer server.Close()

	response, err := server.Client().Get(server.URL + "/api/v1/containers/abc123/logs?tail=abc")
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d", response.StatusCode)
	}
}

func TestContainerLogStreamSSE(t *testing.T) {
	server := httptest.NewServer(handlers.ContainerLogs(engineServiceStub{
		logLines: []docker.LogLine{
			{Stream: "stdout", Line: "one"},
			{Stream: "stderr", Line: "two"},
		},
	}))
	defer server.Close()

	response, err := server.Client().Get(server.URL + "/api/v1/containers/abc123/logs?follow=true")
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if contentType := response.Header.Get("Content-Type"); !strings.HasPrefix(contentType, "text/event-stream") {
		t.Fatalf("content type = %q", contentType)
	}
	body, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{`"stream":"stdout"`, `"line":"one"`, `"line":"two"`} {
		if !strings.Contains(string(body), want) {
			t.Fatalf("body missing %s:\n%s", want, body)
		}
	}
}

func TestContainerStats(t *testing.T) {
	server := httptest.NewServer(handlers.ContainerStats(engineServiceStub{
		stats: docker.ContainerStats{
			ID:            "abc123",
			CPUPercent:    40,
			MemoryUsed:    10485760,
			MemoryLimit:   268435456,
			MemoryPercent: 3.9,
			NetworkRx:     31457280,
			NetworkTx:     4194304,
			Pids:          7,
		},
	}))
	defer server.Close()

	response, err := server.Client().Get(server.URL + "/api/v1/containers/abc123/stats")
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		t.Fatalf("status = %d", response.StatusCode)
	}
	var result struct {
		Data docker.ContainerStats `json:"data"`
	}
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}
	if result.Data.CPUPercent != 40 || result.Data.Pids != 7 {
		t.Fatalf("result = %+v", result)
	}
}

func TestContainerStatsNotFound(t *testing.T) {
	server := httptest.NewServer(handlers.ContainerStats(engineServiceStub{
		statsErr: notFoundError{},
	}))
	defer server.Close()

	response, err := server.Client().Get(server.URL + "/api/v1/containers/abc123/stats")
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusNotFound {
		t.Fatalf("status = %d", response.StatusCode)
	}
}

func TestDockerEventsSSE(t *testing.T) {
	server := httptest.NewServer(handlers.DockerEvents(engineServiceStub{
		events: []docker.EventMessage{
			{Type: "container", Action: "start", Actor: "abc123def456"},
			{Type: "container", Action: "die", Actor: "xyz987lmno32"},
		},
	}))
	defer server.Close()

	response, err := server.Client().Get(server.URL + "/api/v1/docker/events")
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if contentType := response.Header.Get("Content-Type"); !strings.HasPrefix(contentType, "text/event-stream") {
		t.Fatalf("content type = %q", contentType)
	}
	body, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{
		`"type":"docker.event"`,
		`"action":"start"`,
		`"actor":"abc123def456"`,
		`"action":"die"`,
		`"actor":"xyz987lmno32"`,
	} {
		if !strings.Contains(string(body), want) {
			t.Fatalf("body missing %s:\n%s", want, body)
		}
	}
}

func TestDockerEventsStreamingUnsupported(t *testing.T) {
	handler := handlers.DockerEvents(engineServiceStub{})
	request := httptest.NewRequest(http.MethodGet, "/api/v1/docker/events", nil)
	writer := &nonFlushingWriter{header: http.Header{}}
	handler(writer, request)

	if writer.status != http.StatusInternalServerError {
		t.Fatalf("status = %d", writer.status)
	}
	var body errorBody
	if err := json.Unmarshal(writer.written, &body); err != nil {
		t.Fatal(err)
	}
	if body.Code != "streaming_unsupported" {
		t.Fatalf("body = %+v", body)
	}
}

// nonFlushingWriter is an http.ResponseWriter that does not expose Flush, so
// handlers can be exercised on the unsupported-streaming path.
type nonFlushingWriter struct {
	header  http.Header
	status  int
	written []byte
}

func (writer *nonFlushingWriter) Header() http.Header { return writer.header }

func (writer *nonFlushingWriter) WriteHeader(status int) { writer.status = status }

func (writer *nonFlushingWriter) Write(data []byte) (int, error) {
	writer.written = append(writer.written, data...)
	return len(data), nil
}
