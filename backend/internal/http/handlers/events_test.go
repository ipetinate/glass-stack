package handlers_test

import (
	"bufio"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/ipetinate/glass-stack/backend/internal/http/handlers"
	systeminfo "github.com/ipetinate/glass-stack/backend/internal/system"
)

func TestEvents(t *testing.T) {
	cpuTemperature := 57.5
	gpuTemperature := 63.25
	reader := &temperatureReaderStub{
		snapshot: systeminfo.TemperatureSnapshot{
			CPU: &systeminfo.TemperatureValue{
				Celsius: cpuTemperature,
				Sensor:  "cpu-test",
			},
			GPU: &systeminfo.TemperatureValue{
				Celsius: gpuTemperature,
				Sensor:  "gpu-test",
			},
		},
	}
	ioReader := &ioReaderStub{
		snapshot: systeminfo.IOSnapshot{
			Disk: &systeminfo.DiskIOCounters{
				ReadBytes:  1_024,
				WriteBytes: 2_048,
			},
			Memory: &systeminfo.MemoryCounters{
				UsedBytes:      8_000,
				AvailableBytes: 8_000,
				UsedPercent:    50,
			},
			Network: &systeminfo.NetworkIOCounters{
				ReceivedBytes: 4_096,
				SentBytes:     512,
			},
		},
	}
	cpuReader := &cpuReaderStub{
		snapshot: systeminfo.CPUUsageSnapshot{
			Overall: pointer(42.5),
			PerCore: []float64{40, 45},
		},
	}
	gpuReader := &gpuReaderStub{
		snapshot: systeminfo.GPUUsageSnapshot{UsagePercent: pointer(12.5)},
	}

	server := httptest.NewServer(
		handlers.Events(reader, ioReader, cpuReader, gpuReader),
	)
	defer server.Close()

	client := server.Client()
	client.Timeout = 2 * time.Second

	response, err := client.Get(server.URL)
	if err != nil {
		t.Fatalf("failed to request events: %v", err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, response.StatusCode)
	}

	if contentType := response.Header.Get("Content-Type"); contentType != "text/event-stream" {
		t.Fatalf("expected Content-Type text/event-stream, got %q", contentType)
	}

	eventReader := bufio.NewReader(response.Body)
	line, err := eventReader.ReadString('\n')
	if err != nil {
		t.Fatalf("failed to read event: %v", err)
	}

	if !strings.HasPrefix(line, "data: ") {
		t.Fatalf("expected SSE data, got %q", line)
	}

	var event handlers.Event

	if err := json.Unmarshal([]byte(strings.TrimSpace(strings.TrimPrefix(line, "data: "))), &event); err != nil {
		t.Fatalf("failed to decode event: %v", err)
	}

	if event.Payload.CPU == nil || *event.Payload.CPU != cpuTemperature {
		t.Fatalf("expected CPU temperature %.2f, got %v", cpuTemperature, event.Payload.CPU)
	}

	if event.Payload.GPU == nil || *event.Payload.GPU != gpuTemperature {
		t.Fatalf("expected GPU temperature %.2f, got %v", gpuTemperature, event.Payload.GPU)
	}

	if event.Payload.CPUSensor != "cpu-test" {
		t.Fatalf("expected CPU sensor name, got %q", event.Payload.CPUSensor)
	}

	readSSESeparator(t, eventReader)
	cpuLine := readSSEDataLine(t, eventReader)
	var cpuEvent handlers.CPUEvent
	decodeSSELine(t, cpuLine, &cpuEvent)
	if cpuEvent.Payload.Overall == nil || *cpuEvent.Payload.Overall != 42.5 {
		t.Fatalf("expected CPU usage 42.5, got %v", cpuEvent.Payload.Overall)
	}

	readSSESeparator(t, eventReader)
	gpuLine := readSSEDataLine(t, eventReader)
	var gpuEvent handlers.GPUEvent
	decodeSSELine(t, gpuLine, &gpuEvent)
	if gpuEvent.Payload.UsagePercent == nil || *gpuEvent.Payload.UsagePercent != 12.5 {
		t.Fatalf("expected GPU usage 12.5, got %v", gpuEvent.Payload.UsagePercent)
	}

	readSSESeparator(t, eventReader)

	ioLine := readSSEDataLine(t, eventReader)

	var ioEvent handlers.IOEvent

	decodeSSELine(t, ioLine, &ioEvent)

	if ioEvent.Type != "io" {
		t.Fatalf("expected I/O event, got %q", ioEvent.Type)
	}

	if ioEvent.Payload.Memory.UsedBytes == nil ||
		*ioEvent.Payload.Memory.UsedBytes != 8_000 {
		t.Fatalf(
			"expected memory used bytes 8000, got %v",
			ioEvent.Payload.Memory.UsedBytes,
		)
	}

	if ioEvent.Payload.Disk.ReadBytesPerSecond == nil ||
		*ioEvent.Payload.Disk.ReadBytesPerSecond != 0 {
		t.Fatalf(
			"expected initial disk read rate 0, got %v",
			ioEvent.Payload.Disk.ReadBytesPerSecond,
		)
	}
}

type temperatureReaderStub struct {
	snapshot systeminfo.TemperatureSnapshot
	err      error
}

func (stub *temperatureReaderStub) Read(
	context.Context,
) (systeminfo.TemperatureSnapshot, error) {
	return stub.snapshot, stub.err
}

type ioReaderStub struct {
	snapshot systeminfo.IOSnapshot
	err      error
}

func (stub *ioReaderStub) Read(
	context.Context,
) (systeminfo.IOSnapshot, error) {
	return stub.snapshot, stub.err
}

type cpuReaderStub struct {
	snapshot systeminfo.CPUUsageSnapshot
	err      error
}

func (stub *cpuReaderStub) Read(context.Context) (systeminfo.CPUUsageSnapshot, error) {
	return stub.snapshot, stub.err
}

type gpuReaderStub struct {
	snapshot systeminfo.GPUUsageSnapshot
	err      error
}

func (stub *gpuReaderStub) Read(context.Context) (systeminfo.GPUUsageSnapshot, error) {
	return stub.snapshot, stub.err
}

func pointer[T any](value T) *T {
	return &value
}

func readSSESeparator(t *testing.T, reader *bufio.Reader) {
	t.Helper()
	if _, err := reader.ReadString('\n'); err != nil {
		t.Fatalf("failed to read event separator: %v", err)
	}
}

func readSSEDataLine(t *testing.T, reader *bufio.Reader) string {
	t.Helper()
	line, err := reader.ReadString('\n')
	if err != nil {
		t.Fatalf("failed to read SSE event: %v", err)
	}
	return line
}

func decodeSSELine(t *testing.T, line string, target any) {
	t.Helper()
	if err := json.Unmarshal(
		[]byte(strings.TrimSpace(strings.TrimPrefix(line, "data: "))),
		target,
	); err != nil {
		t.Fatalf("failed to decode SSE event: %v", err)
	}
}
