package containers_test

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/ipetinate/glass-stack/backend/internal/containers"
	"github.com/ipetinate/glass-stack/backend/internal/docker"
)

type fakeEngine struct {
	pingErr error
	info    docker.EngineInfo
	infoErr error
	records []docker.ContainerRecord
	listErr error
	pings   int
	infos   int
	lists   int

	detail       docker.ContainerDetail
	detailErr    error
	inspects     int
	lifecycle    []string
	lifecycleErr map[string]error
	logLines     []docker.LogLine
	logsErr      error
	logQueries   []docker.LogQuery

	stats     docker.ContainerStats
	statsErr  error
	statsIDs  []string
	events    []docker.EventMessage
	eventsErr error
}

func (engine *fakeEngine) Ping(context.Context) error {
	engine.pings++
	return engine.pingErr
}

func (engine *fakeEngine) Info(context.Context) (docker.EngineInfo, error) {
	engine.infos++
	return engine.info, engine.infoErr
}

func (engine *fakeEngine) ListContainers(context.Context) ([]docker.ContainerRecord, error) {
	engine.lists++
	return engine.records, engine.listErr
}

func (engine *fakeEngine) InspectContainer(_ context.Context, id string) (docker.ContainerDetail, error) {
	engine.inspects++
	if engine.detailErr != nil {
		return docker.ContainerDetail{}, engine.detailErr
	}
	detail := engine.detail
	if id != "" && detail.ID == "" {
		detail.ID = id
	}
	return detail, nil
}

func (engine *fakeEngine) ContainerStart(_ context.Context, id string) error {
	return engine.recordLifecycle("start", id)
}

func (engine *fakeEngine) ContainerStop(_ context.Context, id string) error {
	return engine.recordLifecycle("stop", id)
}

func (engine *fakeEngine) ContainerRestart(_ context.Context, id string) error {
	return engine.recordLifecycle("restart", id)
}

func (engine *fakeEngine) recordLifecycle(action, id string) error {
	engine.lifecycle = append(engine.lifecycle, action)
	if err := engine.lifecycleErr[action]; err != nil {
		return err
	}
	return nil
}

func (engine *fakeEngine) ContainerLogs(_ context.Context, id string, query docker.LogQuery) ([]docker.LogLine, error) {
	engine.logQueries = append(engine.logQueries, query)
	return engine.logLines, engine.logsErr
}

func (engine *fakeEngine) ContainerLogStream(
	_ context.Context,
	id string,
	query docker.LogQuery,
	emit func(docker.LogLine) error,
) error {
	engine.logQueries = append(engine.logQueries, query)
	if engine.logsErr != nil {
		return engine.logsErr
	}
	for _, line := range engine.logLines {
		if err := emit(line); err != nil {
			return err
		}
	}
	return nil
}

func (engine *fakeEngine) ContainerStats(_ context.Context, id string) (docker.ContainerStats, error) {
	engine.statsIDs = append(engine.statsIDs, id)
	return engine.stats, engine.statsErr
}

func (engine *fakeEngine) EngineEvents(
	_ context.Context,
	emit func(docker.EventMessage) error,
) error {
	if engine.eventsErr != nil {
		return engine.eventsErr
	}
	for _, event := range engine.events {
		if err := emit(event); err != nil {
			return err
		}
	}
	return nil
}

func TestStatusConnected(t *testing.T) {
	service := containers.New(func() (containers.Engine, error) {
		return &fakeEngine{info: docker.EngineInfo{
			ServerVersion:     "27.4.1",
			APIVersion:        "1.47",
			Architecture:      "x86_64",
			OS:                "linux",
			ContainersTotal:   3,
			ContainersRunning: 1,
		}}, nil
	}, true)

	status := service.Status(context.Background())
	if !status.Connected {
		t.Fatalf("status = %+v", status)
	}
	if status.ServerVersion != "27.4.1" || status.Architecture != "x86_64" {
		t.Fatalf("status = %+v", status)
	}
	if status.ContainersTotal != 3 || status.ContainersRunning != 1 {
		t.Fatalf("status = %+v", status)
	}
	if !status.ComposeAvailable {
		t.Fatalf("expected composeAvailable = true")
	}
	if status.Error != "" {
		t.Fatalf("status = %+v", status)
	}
}

func TestStatusDisconnectedWhenDialFails(t *testing.T) {
	dialErr := errors.New("unix open /var/run/docker.sock: no such file")
	service := containers.New(func() (containers.Engine, error) {
		return nil, dialErr
	}, false)

	status := service.Status(context.Background())
	if status.Connected {
		t.Fatal("expected disconnected status")
	}
	if status.Error != dialErr.Error() {
		t.Fatalf("status.Error = %q", status.Error)
	}
	if status.ComposeAvailable {
		t.Fatal("expected composeAvailable = false")
	}
}

func TestStatusDisconnectedWhenEngineProbeFails(t *testing.T) {
	service := containers.New(func() (containers.Engine, error) {
		return &fakeEngine{pingErr: errors.New("connection refused")}, nil
	}, false)

	status := service.Status(context.Background())
	if status.Connected {
		t.Fatal("expected disconnected status")
	}
	if status.Error == "" {
		t.Fatal("expected an engine error")
	}
}

func TestStatusRetriesDialAfterEngineFailure(t *testing.T) {
	var attempts int
	service := containers.New(func() (containers.Engine, error) {
		attempts++
		if attempts == 1 {
			return nil, errors.New("first attempt offline")
		}
		return &fakeEngine{info: docker.EngineInfo{ServerVersion: "27.4.1"}}, nil
	}, false)

	first := service.Status(context.Background())
	if first.Connected {
		t.Fatal("expected first status disconnected")
	}
	second := service.Status(context.Background())
	if !second.Connected {
		t.Fatalf("expected reconnect, status = %+v", second)
	}
}

func TestStatusReconnectsAfterEngineBecomesUnreachable(t *testing.T) {
	engine := &fakeEngine{}
	service := containers.New(func() (containers.Engine, error) {
		return engine, nil
	}, false)

	connected := service.Status(context.Background())
	if !connected.Connected {
		t.Fatal("expected connected")
	}

	engine.pingErr = errors.New("engine stopped")
	disconnected := service.Status(context.Background())
	if disconnected.Connected {
		t.Fatal("expected disconnected after engine stops")
	}

	engine.pingErr = nil
	again := service.Status(context.Background())
	if !again.Connected {
		t.Fatal("expected reconnect after engine recovers")
	}
}

func TestListContainers(t *testing.T) {
	records := []docker.ContainerRecord{{
		ID:        "abc123",
		Name:      "uptime-kuma",
		Image:     "louislam/uptime-kuma:1.23.16",
		State:     "running",
		Status:    "Up 2 hours",
		CreatedAt: time.Unix(1700000000, 0).UTC(),
	}}
	service := containers.New(func() (containers.Engine, error) {
		return &fakeEngine{records: records}, nil
	}, false)

	result, err := service.List(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if len(result) != 1 || result[0].Name != "uptime-kuma" {
		t.Fatalf("result = %+v", result)
	}
}

func TestListContainersReturnsErrorWhenUnreachable(t *testing.T) {
	service := containers.New(func() (containers.Engine, error) {
		return nil, errors.New("unreachable")
	}, false)

	if _, err := service.List(context.Background()); err == nil {
		t.Fatal("expected an error when the engine is unreachable")
	}
}

func TestListContainersInvalidatesOnEngineError(t *testing.T) {
	engine := &fakeEngine{records: []docker.ContainerRecord{{ID: "a"}}}
	dialCalls := 0
	service := containers.New(func() (containers.Engine, error) {
		dialCalls++
		return engine, nil
	}, false)

	if _, err := service.List(context.Background()); err != nil {
		t.Fatal(err)
	}

	engine.listErr = errors.New("engine disconnected")
	if _, err := service.List(context.Background()); err == nil {
		t.Fatal("expected error after engine disconnects")
	}

	engine.listErr = nil
	if _, err := service.List(context.Background()); err != nil {
		t.Fatalf("expected recovery, got %v", err)
	}
	if dialCalls != 2 {
		t.Fatalf("dialCalls = %d, want 2", dialCalls)
	}
}

func TestContainerDetail(t *testing.T) {
	engine := &fakeEngine{detail: docker.ContainerDetail{
		ID:        "abc123",
		Name:      "uptime-kuma",
		State:     "running",
		Health:    "healthy",
		Image:     "louislam/uptime-kuma:1.23.16",
		IPAddress: "172.17.0.2",
	}}
	service := containers.New(func() (containers.Engine, error) {
		return engine, nil
	}, false)

	detail, err := service.Detail(context.Background(), "abc123")
	if err != nil {
		t.Fatal(err)
	}
	if detail.Name != "uptime-kuma" || detail.Health != "healthy" ||
		detail.IPAddress != "172.17.0.2" {
		t.Fatalf("detail = %+v", detail)
	}
	if engine.inspects != 1 {
		t.Fatalf("inspects = %d, want 1", engine.inspects)
	}
}

func TestContainerDetailUnreachable(t *testing.T) {
	service := containers.New(func() (containers.Engine, error) {
		return nil, errors.New("unreachable")
	}, false)

	if _, err := service.Detail(context.Background(), "abc123"); err == nil {
		t.Fatal("expected an error when the engine is unreachable")
	}
}

func TestContainerLifecycle(t *testing.T) {
	engine := &fakeEngine{}
	service := containers.New(func() (containers.Engine, error) {
		return engine, nil
	}, false)

	for _, action := range []containers.LifecycleAction{
		containers.LifecycleStart,
		containers.LifecycleStop,
		containers.LifecycleRestart,
	} {
		if err := service.Lifecycle(context.Background(), action, "abc123"); err != nil {
			t.Fatalf("%s failed: %v", action, err)
		}
	}
	if got := strings.Join(engine.lifecycle, ","); got != "start,stop,restart" {
		t.Fatalf("lifecycle = %q", got)
	}
}

func TestContainerLifecycleUnsupported(t *testing.T) {
	service := containers.New(func() (containers.Engine, error) {
		return &fakeEngine{}, nil
	}, false)

	if err := service.Lifecycle(context.Background(), containers.LifecycleAction("explode"), "abc123"); err == nil {
		t.Fatal("expected an error for unsupported action")
	}
}

func TestContainerLogs(t *testing.T) {
	engine := &fakeEngine{logLines: []docker.LogLine{
		{Stream: "stdout", Line: "listening on :3001"},
	}}
	service := containers.New(func() (containers.Engine, error) {
		return engine, nil
	}, false)

	lines, err := service.Logs(context.Background(), "abc123", docker.LogQuery{Tail: 50})
	if err != nil {
		t.Fatal(err)
	}
	if len(lines) != 1 || lines[0].Line != "listening on :3001" {
		t.Fatalf("lines = %+v", lines)
	}
	if len(engine.logQueries) != 1 || engine.logQueries[0].Tail != 50 {
		t.Fatalf("queries = %+v", engine.logQueries)
	}
}

func TestContainerLogStream(t *testing.T) {
	engine := &fakeEngine{logLines: []docker.LogLine{
		{Stream: "stdout", Line: "one"},
		{Stream: "stderr", Line: "two"},
	}}
	service := containers.New(func() (containers.Engine, error) {
		return engine, nil
	}, false)

	var received []docker.LogLine
	err := service.StreamLogs(
		context.Background(),
		"abc123",
		docker.LogQuery{Follow: true},
		func(line docker.LogLine) error {
			received = append(received, line)
			return nil
		},
	)
	if err != nil {
		t.Fatal(err)
	}
	if len(received) != 2 || received[1].Stream != "stderr" {
		t.Fatalf("received = %+v", received)
	}
	if len(engine.logQueries) != 1 || !engine.logQueries[0].Follow {
		t.Fatalf("queries = %+v", engine.logQueries)
	}
}

func TestContainerStats(t *testing.T) {
	engine := &fakeEngine{stats: docker.ContainerStats{
		ID:            "abc123",
		CPUPercent:    40,
		MemoryUsed:    10485760,
		MemoryLimit:   268435456,
		MemoryPercent: 3.9,
	}}
	service := containers.New(func() (containers.Engine, error) {
		return engine, nil
	}, false)

	stats, err := service.Stats(context.Background(), "abc123")
	if err != nil {
		t.Fatal(err)
	}
	if stats.CPUPercent != 40 || stats.MemoryLimit != 268435456 {
		t.Fatalf("stats = %+v", stats)
	}
	if len(engine.statsIDs) != 1 || engine.statsIDs[0] != "abc123" {
		t.Fatalf("statsIDs = %+v", engine.statsIDs)
	}
}

func TestContainerStatsInvalidatesOnEngineError(t *testing.T) {
	engine := &fakeEngine{}
	dialCalls := 0
	service := containers.New(func() (containers.Engine, error) {
		dialCalls++
		return engine, nil
	}, false)

	if _, err := service.Stats(context.Background(), "abc123"); err != nil {
		t.Fatal(err)
	}

	engine.statsErr = errors.New("engine stopped")
	if _, err := service.Stats(context.Background(), "abc123"); err == nil {
		t.Fatal("expected error after engine stops")
	}

	engine.statsErr = nil
	if _, err := service.Stats(context.Background(), "abc123"); err != nil {
		t.Fatalf("expected recovery, got %v", err)
	}
	if dialCalls != 2 {
		t.Fatalf("dialCalls = %d, want 2", dialCalls)
	}
}

func TestStreamEvents(t *testing.T) {
	engine := &fakeEngine{events: []docker.EventMessage{
		{Type: "container", Action: "start", Actor: "abc123def456"},
		{Type: "container", Action: "die", Actor: "xyz987lmno32"},
	}}
	service := containers.New(func() (containers.Engine, error) {
		return engine, nil
	}, false)

	var received []docker.EventMessage
	err := service.StreamEvents(context.Background(), func(event docker.EventMessage) error {
		received = append(received, event)
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(received) != 2 || received[1].Action != "die" {
		t.Fatalf("received = %+v", received)
	}
}

func TestStreamEventsReturnsErrorWhenUnreachable(t *testing.T) {
	service := containers.New(func() (containers.Engine, error) {
		return nil, errors.New("unreachable")
	}, false)

	if err := service.StreamEvents(context.Background(), func(docker.EventMessage) error {
		return nil
	}); err == nil {
		t.Fatal("expected an error when the engine is unreachable")
	}
}
