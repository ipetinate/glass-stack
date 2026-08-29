package docker_test

import (
	"context"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/ipetinate/glass-stack/backend/internal/docker"
)

// fakeEngineDaemon is a minimal Docker Engine API fake used to exercise the
// official client without a real daemon. The SDK negotiates the API version,
// so versioned and unversioned endpoints are both accepted.
type fakeEngineDaemon struct {
	server  *httptest.Server
	mu      sync.Mutex
	actions []string
}

func (daemon *fakeEngineDaemon) recordAction(action string) {
	daemon.mu.Lock()
	defer daemon.mu.Unlock()
	daemon.actions = append(daemon.actions, action)
}

func newFakeEngineDaemon(t *testing.T) *fakeEngineDaemon {
	t.Helper()

	daemon := &fakeEngineDaemon{}
	mux := http.NewServeMux()
	mux.HandleFunc("/_ping", func(response http.ResponseWriter, request *http.Request) {
		response.Header().Set("API-Version", "1.47")
		response.Header().Set("Ostype", "linux")
		response.Header().Set("Builder-Version", "2")
		response.WriteHeader(http.StatusOK)
		_, _ = response.Write([]byte("OK"))
	})
	mux.HandleFunc("/", func(response http.ResponseWriter, request *http.Request) {
		path := strings.TrimPrefix(request.URL.Path, "/v1.")
		switch {
		case strings.HasPrefix(path, "/v") && hasSuffix(path, "/_ping"):
			response.Header().Set("API-Version", "1.47")
			response.Header().Set("Ostype", "linux")
			response.WriteHeader(http.StatusOK)
			_, _ = response.Write([]byte("OK"))
		case strings.HasSuffix(path, "/version"):
			_ = json.NewEncoder(response).Encode(map[string]any{
				"Version":    "27.4.1",
				"ApiVersion": "1.47",
				"Arch":       "x86_64",
				"Os":         "linux",
			})
		case strings.HasSuffix(path, "/info"):
			_ = json.NewEncoder(response).Encode(map[string]any{
				"ServerVersion":     "27.4.1",
				"Architecture":      "x86_64",
				"OperatingSystem":   "Docker Desktop",
				"OSType":            "linux",
				"Containers":        5,
				"ContainersRunning": 2,
				"NCPU":              10,
			})
		case strings.HasSuffix(path, "/containers/json"):
			_ = json.NewEncoder(response).Encode([]map[string]any{
				{
					"Id":      "abc123",
					"Names":   []string{"/uptime-kuma"},
					"Image":   "louislam/uptime-kuma:1.23.16",
					"ImageID": "sha256:def456",
					"Created": int64(1700000000),
					"Ports": []map[string]any{
						{"IP": "0.0.0.0", "PrivatePort": 3001, "PublicPort": 3001, "Type": "tcp"},
					},
					"State":  "running",
					"Status": "Up 2 hours",
					"Labels": map[string]string{
						"com.docker.compose.project": "glass-uptime-kuma",
					},
				},
			})
		case strings.HasSuffix(path, "/containers/abc123/json"):
			_ = json.NewEncoder(response).Encode(map[string]any{
				"Id":           "abc123",
				"Name":         "/uptime-kuma",
				"Created":      "2026-08-01T10:00:00Z",
				"RestartCount": 1,
				"State": map[string]any{
					"Status":    "running",
					"ExitCode":  0,
					"StartedAt": "2026-08-02T10:00:00Z",
					"Health":    map[string]any{"Status": "healthy"},
				},
				"Config": map[string]any{
					"Image":  "louislam/uptime-kuma:1.23.16",
					"Env":    []string{"TOKEN=secret", "PORT=3001"},
					"Labels": map[string]string{"com.docker.compose.project": "glass-uptime-kuma"},
				},
				"HostConfig": map[string]any{"NetworkMode": "bridge"},
				"Mounts": []map[string]any{
					{
						"Type":        "bind",
						"Source":      "/home/user/glass/app-data/uptime-kuma/data",
						"Destination": "/app/data",
						"RW":          true,
					},
				},
				"NetworkSettings": map[string]any{
					"Networks": map[string]any{
						"default": map[string]any{"IPAddress": "172.17.0.2"},
					},
					"Ports": map[string]any{
						"3001/tcp": []map[string]any{
							{"HostIp": "0.0.0.0", "HostPort": "3001"},
						},
					},
				},
			})
		case request.Method == http.MethodPost && strings.HasSuffix(path, "/containers/abc123/start"):
			daemon.recordAction("start")
			response.WriteHeader(http.StatusNoContent)
		case request.Method == http.MethodPost && strings.HasSuffix(path, "/containers/abc123/stop"):
			daemon.recordAction("stop")
			response.WriteHeader(http.StatusNoContent)
		case request.Method == http.MethodPost && strings.HasSuffix(path, "/containers/abc123/restart"):
			daemon.recordAction("restart")
			response.WriteHeader(http.StatusNoContent)
		case strings.HasSuffix(path, "/containers/abc123/logs"):
			writeDemuxedLogs(response, [][2][]byte{
				{[]byte{1}, []byte("listening on :3001\n")},
				{[]byte{2}, []byte("warn: slow poll\n")},
			})
		case strings.HasSuffix(path, "/containers/abc123/stats"):
			_ = json.NewEncoder(response).Encode(map[string]any{
				"read":       "2026-08-27T12:00:00Z",
				"preread":    "2026-08-27T11:59:59.8Z",
				"pids_stats": map[string]any{"current": 7},
				"cpu_stats": map[string]any{
					"cpu_usage":        map[string]any{"total_usage": uint64(1500)},
					"system_cpu_usage": uint64(20000),
					"online_cpus":      4,
				},
				"precpu_stats": map[string]any{
					"cpu_usage":        map[string]any{"total_usage": uint64(1000)},
					"system_cpu_usage": uint64(15000),
				},
				"memory_stats": map[string]any{
					"usage": uint64(10485760),
					"limit": uint64(268435456),
				},
				"networks": map[string]any{
					"eth0": map[string]any{
						"rx_bytes": uint64(31457280),
						"tx_bytes": uint64(4194304),
					},
				},
				"blkio_stats": map[string]any{
					"io_service_bytes_recursive": []map[string]any{
						{"op": "read", "value": uint64(8192)},
						{"op": "write", "value": uint64(4096)},
					},
				},
			})
		case strings.HasSuffix(path, "/events"):
			writeEngineEvents(response)
		default:
			http.NotFound(response, request)
		}
	})

	server := httptest.NewServer(mux)
	t.Cleanup(server.Close)
	daemon.server = server
	return daemon
}

func (daemon *fakeEngineDaemon) host() string {
	return daemon.server.URL
}

func hasSuffix(value, suffix string) bool {
	return strings.HasSuffix(value, suffix)
}

// writeDemuxedLogs writes docker multiplexed stream frames (8-byte header:
// stream byte, then big-endian payload size) mimicking a non-TTY container.
func writeDemuxedLogs(response http.ResponseWriter, frames [][2][]byte) {
	response.WriteHeader(http.StatusOK)
	for _, frame := range frames {
		stream := frame[0][0]
		payload := frame[1]
		header := make([]byte, 8)
		header[0] = stream
		binary.BigEndian.PutUint32(header[4:], uint32(len(payload)))
		_, _ = response.Write(header)
		_, _ = response.Write(payload)
	}
	response.(http.Flusher).Flush()
}

// writeEngineEvents streams two newline-delimited engine events and then
// closes the body, mimicking the Docker /events endpoint.
func writeEngineEvents(response http.ResponseWriter) {
	response.WriteHeader(http.StatusOK)
	events := []map[string]any{
		{
			"status": "start",
			"id":     "abc123",
			"from":   "louislam/uptime-kuma:1.23.16",
			"Type":   "container",
			"Action": "start",
			"Actor": map[string]any{
				"ID":         "abc123def456ghi789",
				"Attributes": map[string]string{"name": "uptime-kuma"},
			},
			"time": int64(1700000000),
		},
		{
			"status": "die",
			"id":     "xyz987",
			"from":   "ghost:5.2",
			"Type":   "container",
			"Action": "die",
			"Actor": map[string]any{
				"ID":         "xyz987lmno321pqr654",
				"Attributes": map[string]string{"name": "ghost"},
			},
			"time": int64(1700000060),
		},
	}
	for _, event := range events {
		_ = json.NewEncoder(response).Encode(event)
	}
	response.(http.Flusher).Flush()
}

func TestDialConnectsToFakeEngine(t *testing.T) {
	daemon := newFakeEngineDaemon(t)

	engine, err := docker.Dial([]string{daemon.host()}, 2*time.Second)
	if err != nil {
		t.Fatalf("dial failed: %v", err)
	}
	if err := engine.Ping(context.Background()); err != nil {
		t.Fatalf("ping failed: %v", err)
	}
}

func TestDialFailsWhenEngineUnreachable(t *testing.T) {
	if _, err := docker.Dial([]string{"http://127.0.0.1:1"}, 200*time.Millisecond); err == nil {
		t.Fatal("expected dial to fail for unreachable engine")
	}
}

func TestEngineInfo(t *testing.T) {
	daemon := newFakeEngineDaemon(t)
	engine, err := docker.Dial([]string{daemon.host()}, 2*time.Second)
	if err != nil {
		t.Fatal(err)
	}

	info, err := engine.Info(context.Background())
	if err != nil {
		t.Fatalf("info failed: %v", err)
	}
	if info.ServerVersion != "27.4.1" || info.APIVersion != "1.47" {
		t.Fatalf("info = %+v", info)
	}
	if info.Architecture != "x86_64" || info.OS != "linux" {
		t.Fatalf("info = %+v", info)
	}
	if info.ContainersRunning != 2 || info.ContainersTotal != 5 {
		t.Fatalf("info = %+v", info)
	}
}

func TestEngineListContainers(t *testing.T) {
	daemon := newFakeEngineDaemon(t)
	engine, err := docker.Dial([]string{daemon.host()}, 2*time.Second)
	if err != nil {
		t.Fatal(err)
	}

	records, err := engine.ListContainers(context.Background())
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if len(records) != 1 {
		t.Fatalf("records = %+v", records)
	}
	record := records[0]
	if record.Name != "uptime-kuma" || record.Image != "louislam/uptime-kuma:1.23.16" {
		t.Fatalf("record = %+v", record)
	}
	if record.State != "running" || record.Status != "Up 2 hours" {
		t.Fatalf("record = %+v", record)
	}
	if len(record.Ports) != 1 || record.Ports[0].HostPort != "3001" ||
		record.Ports[0].ContainerPort != 3001 || record.Ports[0].Protocol != "tcp" {
		t.Fatalf("record.Ports = %+v", record.Ports)
	}
	if !record.CreatedAt.Equal(time.Unix(1700000000, 0).UTC()) {
		t.Fatalf("CreatedAt = %v", record.CreatedAt)
	}
	if record.Labels["com.docker.compose.project"] != "glass-uptime-kuma" {
		t.Fatalf("labels = %+v", record.Labels)
	}
}

func TestEngineInspectContainer(t *testing.T) {
	daemon := newFakeEngineDaemon(t)
	engine, err := docker.Dial([]string{daemon.host()}, 2*time.Second)
	if err != nil {
		t.Fatal(err)
	}

	detail, err := engine.InspectContainer(context.Background(), "abc123")
	if err != nil {
		t.Fatalf("inspect failed: %v", err)
	}
	if detail.ID != "abc123" || detail.Name != "uptime-kuma" {
		t.Fatalf("detail = %+v", detail)
	}
	if detail.State != "running" || detail.Health != "healthy" {
		t.Fatalf("detail = %+v", detail)
	}
	if detail.Image != "louislam/uptime-kuma:1.23.16" {
		t.Fatalf("detail = %+v", detail)
	}
	if detail.RestartCount != 1 || detail.NetworkMode != "bridge" || detail.IPAddress != "172.17.0.2" {
		t.Fatalf("detail = %+v", detail)
	}
	if len(detail.Mounts) != 1 ||
		detail.Mounts[0].Destination != "/app/data" ||
		detail.Mounts[0].Source == "" ||
		detail.Mounts[0].ReadOnly {
		t.Fatalf("detail.Mounts = %+v", detail.Mounts)
	}
	if len(detail.Ports) != 1 || detail.Ports[0].HostPort != "3001" ||
		detail.Ports[0].ContainerPort != 3001 {
		t.Fatalf("detail.Ports = %+v", detail.Ports)
	}
	if len(detail.Environment) != 2 || detail.Environment[0] != "TOKEN=secret" {
		t.Fatalf("detail.Environment = %+v", detail.Environment)
	}
	if !detail.CreatedAt.Equal(time.Date(2026, 8, 1, 10, 0, 0, 0, time.UTC)) {
		t.Fatalf("CreatedAt = %v", detail.CreatedAt)
	}
}

func TestEngineContainerLifecycle(t *testing.T) {
	daemon := newFakeEngineDaemon(t)
	engine, err := docker.Dial([]string{daemon.host()}, 2*time.Second)
	if err != nil {
		t.Fatal(err)
	}

	checks := []struct {
		action string
		call   func(context.Context, string) error
	}{
		{"start", engine.ContainerStart},
		{"stop", engine.ContainerStop},
		{"restart", engine.ContainerRestart},
	}
	for _, check := range checks {
		if err := check.call(context.Background(), "abc123"); err != nil {
			t.Fatalf("%s failed: %v", check.action, err)
		}
	}

	daemon.mu.Lock()
	defer daemon.mu.Unlock()
	if strings.Join(daemon.actions, ",") != "start,stop,restart" {
		t.Fatalf("actions = %+v", daemon.actions)
	}
}

func TestEngineContainerLogs(t *testing.T) {
	daemon := newFakeEngineDaemon(t)
	engine, err := docker.Dial([]string{daemon.host()}, 2*time.Second)
	if err != nil {
		t.Fatal(err)
	}

	lines, err := engine.ContainerLogs(context.Background(), "abc123", docker.LogQuery{Tail: 100})
	if err != nil {
		t.Fatalf("logs failed: %v", err)
	}
	if len(lines) != 2 {
		t.Fatalf("lines = %+v", lines)
	}
	if lines[0].Stream != "stdout" || lines[0].Line != "listening on :3001" {
		t.Fatalf("lines[0] = %+v", lines[0])
	}
	if lines[1].Stream != "stderr" || lines[1].Line != "warn: slow poll" {
		t.Fatalf("lines[1] = %+v", lines[1])
	}
}

func TestEngineContainerLogStream(t *testing.T) {
	daemon := newFakeEngineDaemon(t)
	engine, err := docker.Dial([]string{daemon.host()}, 2*time.Second)
	if err != nil {
		t.Fatal(err)
	}

	var received []docker.LogLine
	err = engine.ContainerLogStream(
		context.Background(),
		"abc123",
		docker.LogQuery{Follow: true},
		func(line docker.LogLine) error {
			received = append(received, line)
			return nil
		},
	)
	if err != nil {
		t.Fatalf("stream failed: %v", err)
	}
	if len(received) != 2 || received[0].Line != "listening on :3001" ||
		received[1].Stream != "stderr" {
		t.Fatalf("received = %+v", received)
	}
}

func TestEngineContainerStats(t *testing.T) {
	daemon := newFakeEngineDaemon(t)
	engine, err := docker.Dial([]string{daemon.host()}, 2*time.Second)
	if err != nil {
		t.Fatal(err)
	}

	stats, err := engine.ContainerStats(context.Background(), "abc123")
	if err != nil {
		t.Fatalf("stats failed: %v", err)
	}
	if stats.ID != "abc123" {
		t.Fatalf("stats = %+v", stats)
	}
	if stats.CPUPercent != 40 {
		t.Fatalf("CPUPercent = %v", stats.CPUPercent)
	}
	if stats.MemoryUsed != 10485760 || stats.MemoryLimit != 268435456 {
		t.Fatalf("memory = %+v", stats)
	}
	if !strings.Contains(fmt.Sprintf("%.2f", stats.MemoryPercent), "3.9") {
		t.Fatalf("MemoryPercent = %v", stats.MemoryPercent)
	}
	if stats.NetworkRx != 31457280 || stats.NetworkTx != 4194304 {
		t.Fatalf("network = %+v", stats)
	}
	if stats.BlockRead != 8192 || stats.BlockWrite != 4096 {
		t.Fatalf("block = %+v", stats)
	}
	if stats.Pids != 7 {
		t.Fatalf("Pids = %+v", stats)
	}
}

func TestEngineEvents(t *testing.T) {
	daemon := newFakeEngineDaemon(t)
	engine, err := docker.Dial([]string{daemon.host()}, 2*time.Second)
	if err != nil {
		t.Fatal(err)
	}

	var received []docker.EventMessage
	err = engine.EngineEvents(context.Background(), func(event docker.EventMessage) error {
		received = append(received, event)
		return nil
	})
	if err != nil {
		t.Fatalf("events failed: %v", err)
	}
	if len(received) != 2 {
		t.Fatalf("received = %+v", received)
	}
	if received[0].Type != "container" || received[0].Action != "start" ||
		received[0].Actor != "abc123def456" {
		t.Fatalf("received[0] = %+v", received[0])
	}
	if !received[0].Time.Equal(time.Unix(1700000000, 0).UTC()) {
		t.Fatalf("received[0].Time = %v", received[0].Time)
	}
	if received[1].Action != "die" || received[1].Actor != "xyz987lmno32" {
		t.Fatalf("received[1] = %+v", received[1])
	}
}
