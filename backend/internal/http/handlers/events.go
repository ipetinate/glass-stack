package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/ipetinate/glass-stack/backend/internal/events"
	"github.com/ipetinate/glass-stack/backend/internal/host"
	systeminfo "github.com/ipetinate/glass-stack/backend/internal/system"
)

// These aliases preserve the current API package contract while the payload
// ownership moves to the host domain.
type TemperaturePayload = host.TemperaturePayload
type CPUUsagePayload = host.CPUUsagePayload
type GPUUsagePayload = host.GPUUsagePayload
type IOPayload = host.IOPayload
type IOThroughputPayload = host.IOThroughputPayload
type MemoryPayload = host.MemoryPayload

// Event and its typed variants are compatibility DTOs for existing clients and
// tests. New transport code consumes events.Event directly.
type Event struct {
	ID            string             `json:"id"`
	SchemaVersion int                `json:"schemaVersion"`
	Type          string             `json:"type"`
	OccurredAt    time.Time          `json:"occurredAt"`
	Payload       TemperaturePayload `json:"payload"`
}

type IOEvent struct {
	ID            string    `json:"id"`
	SchemaVersion int       `json:"schemaVersion"`
	Type          string    `json:"type"`
	OccurredAt    time.Time `json:"occurredAt"`
	Payload       IOPayload `json:"payload"`
}

type CPUEvent struct {
	ID            string          `json:"id"`
	SchemaVersion int             `json:"schemaVersion"`
	Type          string          `json:"type"`
	OccurredAt    time.Time       `json:"occurredAt"`
	Payload       CPUUsagePayload `json:"payload"`
}

type GPUEvent struct {
	ID            string          `json:"id"`
	SchemaVersion int             `json:"schemaVersion"`
	Type          string          `json:"type"`
	OccurredAt    time.Time       `json:"occurredAt"`
	Payload       GPUUsagePayload `json:"payload"`
}

type TemperatureReader interface {
	Read(context.Context) (systeminfo.TemperatureSnapshot, error)
}

type IOReader interface {
	Read(context.Context) (systeminfo.IOSnapshot, error)
}

type CPUReader interface {
	Read(context.Context) (systeminfo.CPUUsageSnapshot, error)
}

type GPUReader interface {
	Read(context.Context) (systeminfo.GPUUsageSnapshot, error)
}

const (
	DefaultEventIntervalSeconds = 1
	MinEventIntervalSeconds     = 1
	MaxEventIntervalSeconds     = 5
)

// EventStream adapts the internal event broker to Server-Sent Events. It does
// not collect metrics or create domain events.
func EventStream(broker *events.Broker) http.HandlerFunc {
	return func(response http.ResponseWriter, request *http.Request) {
		flusher, ok := response.(http.Flusher)
		if !ok {
			http.Error(response, "streaming unsupported", http.StatusInternalServerError)
			return
		}

		response.Header().Set("Content-Type", "text/event-stream")
		response.Header().Set("Cache-Control", "no-cache")
		response.Header().Set("Connection", "keep-alive")
		flusher.Flush()

		subscription := broker.SubscribeAfter(
			request.Context(),
			request.Header.Get("Last-Event-ID"),
		)
		defer subscription.Close()

		interval := eventInterval(request.URL.Query().Get("interval"))
		var lastBatch time.Time
		var currentBatch time.Time
		forwardBatch := true

		for {
			select {
			case <-request.Context().Done():
				return
			case event, open := <-subscription.Events():
				if !open {
					return
				}

				if !event.OccurredAt.Equal(currentBatch) {
					currentBatch = event.OccurredAt
					forwardBatch = lastBatch.IsZero() ||
						event.OccurredAt.Sub(lastBatch) >= interval
					if forwardBatch {
						lastBatch = event.OccurredAt
					}
				}

				if forwardBatch && !writeSSE(response, flusher, event) {
					return
				}
			}
		}
	}
}

// OperationEventStream forwards glass.apps.* broker events verbatim, without
// the interval batching that EventStream applies to host metrics. App
// operations publish a handful of steps per install, so every event must reach
// the client immediately rather than being throttled to one per window.
func OperationEventStream(broker *events.Broker) http.HandlerFunc {
	return func(response http.ResponseWriter, request *http.Request) {
		flusher, ok := response.(http.Flusher)
		if !ok {
			http.Error(response, "streaming unsupported", http.StatusInternalServerError)
			return
		}

		response.Header().Set("Content-Type", "text/event-stream")
		response.Header().Set("Cache-Control", "no-cache")
		response.Header().Set("Connection", "keep-alive")
		flusher.Flush()

		subscription := broker.SubscribeAfter(
			request.Context(),
			request.Header.Get("Last-Event-ID"),
		)
		defer subscription.Close()

		for {
			select {
			case <-request.Context().Done():
				return
			case event, open := <-subscription.Events():
				if !open {
					return
				}
				if !strings.HasPrefix(event.Type, "glass.apps.") {
					continue
				}
				if !writeSSE(response, flusher, event) {
					return
				}
			}
		}
	}
}

// Events is kept as a compatibility constructor for callers that used the
// original handler directly. The router uses EventStream with one shared
// broker and one host metrics publisher.
func Events(
	temperatureReader TemperatureReader,
	ioReader IOReader,
	cpuReader CPUReader,
	gpuReader GPUReader,
) http.HandlerFunc {
	return func(response http.ResponseWriter, request *http.Request) {
		broker := events.NewBroker(32, 8)
		service := host.NewMetricsService(
			temperatureReader,
			ioReader,
			cpuReader,
			gpuReader,
		)

		go func() {
			_ = service.Run(request.Context(), broker, time.Second)
		}()

		EventStream(broker).ServeHTTP(response, request)
	}
}

func eventInterval(raw string) time.Duration {
	seconds, err := strconv.Atoi(raw)
	if err != nil || seconds < MinEventIntervalSeconds || seconds > MaxEventIntervalSeconds {
		seconds = DefaultEventIntervalSeconds
	}
	return time.Duration(seconds) * time.Second
}

func ioPayload(
	previous systeminfo.IOSnapshot,
	current systeminfo.IOSnapshot,
	elapsed time.Duration,
) IOPayload {
	return host.IOPayloadFromSnapshots(previous, current, elapsed)
}

func writeSSE(
	response http.ResponseWriter,
	flusher http.Flusher,
	event events.Event,
) bool {
	data, err := json.Marshal(event)
	if err != nil {
		return false
	}
	if _, err := fmt.Fprintf(
		response,
		"id: %s\ndata: %s\n\n",
		event.ID,
		data,
	); err != nil {
		return false
	}
	flusher.Flush()
	return true
}
