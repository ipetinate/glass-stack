package apps

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"
)

// fakeEngine fakes the container engine seen by the reconciler. StreamEvents
// emits its configured events once (draining the queue) and then returns,
// unless block is set, in which case it waits for the context and returns its
// error so the reconciler surfaces context cancellation.
type fakeEngine struct {
	mu          sync.Mutex
	containers  []ReconcileContainer
	listErr     error
	events      []ReconcileEvent
	streamCalls int
	block       bool
}

func (engine *fakeEngine) List(_ context.Context) ([]ReconcileContainer, error) {
	engine.mu.Lock()
	defer engine.mu.Unlock()
	return append([]ReconcileContainer(nil), engine.containers...), engine.listErr
}

func (engine *fakeEngine) StreamEvents(ctx context.Context, emit func(ReconcileEvent) error) error {
	engine.mu.Lock()
	engine.streamCalls++
	events := append([]ReconcileEvent(nil), engine.events...)
	engine.events = nil
	block := engine.block
	engine.mu.Unlock()
	if block {
		<-ctx.Done()
		return ctx.Err()
	}
	for _, event := range events {
		if err := emit(event); err != nil {
			return err
		}
	}
	return nil
}

func (engine *fakeEngine) streams() int {
	engine.mu.Lock()
	defer engine.mu.Unlock()
	return engine.streamCalls
}

// countingStore wraps the in-memory store to count runtime updates, proving
// that the reconciler resyncs after docker events.
type countingStore struct {
	*memoryStore
	countMu     sync.Mutex
	runtimeUpdt int
}

func (store *countingStore) UpdateInstanceRuntime(
	ctx context.Context,
	appID string,
	runtime RuntimeStatus,
	lastError string,
) error {
	store.countMu.Lock()
	store.runtimeUpdt++
	store.countMu.Unlock()
	return store.memoryStore.UpdateInstanceRuntime(ctx, appID, runtime, lastError)
}

func (store *countingStore) updates() int {
	store.countMu.Lock()
	defer store.countMu.Unlock()
	return store.runtimeUpdt
}

func waitUntil(t *testing.T, what string, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(3 * time.Second)
	for {
		if cond() {
			return
		}
		if time.Now().After(deadline) {
			t.Fatalf("timed out waiting for %s", what)
		}
		time.Sleep(5 * time.Millisecond)
	}
}

func instanceRuntime(t *testing.T, store Store, appID string) RuntimeStatus {
	t.Helper()
	instance, err := store.LoadInstance(context.Background(), appID)
	if err != nil {
		t.Fatal(err)
	}
	return instance.Runtime
}

func TestResyncMapsNoContainersToStopped(t *testing.T) {
	store := newMemoryStore()
	seedInstalled(store, "uptime-kuma", InstallOptions{}, "1.0.0")
	reconciler := NewReconciler(store, &fakeEngine{}, nil)
	if err := reconciler.Resync(context.Background()); err != nil {
		t.Fatal(err)
	}
	if got := instanceRuntime(t, store, "uptime-kuma"); got != RuntimeStopped {
		t.Fatalf("runtime = %q", got)
	}
}

func TestResyncMapsAllRunningContainersToRunning(t *testing.T) {
	store := newMemoryStore()
	seedInstalled(store, "uptime-kuma", InstallOptions{}, "1.0.0")
	engine := &fakeEngine{containers: []ReconcileContainer{
		{Name: "uptime-kuma-uptime-kuma-1", Running: true},
	}}
	reconciler := NewReconciler(store, engine, nil)
	if err := reconciler.Resync(context.Background()); err != nil {
		t.Fatal(err)
	}
	if got := instanceRuntime(t, store, "uptime-kuma"); got != RuntimeRunning {
		t.Fatalf("runtime = %q", got)
	}
}

func TestResyncMapsMixedContainersToDegraded(t *testing.T) {
	store := newMemoryStore()
	seedInstalled(store, "uptime-kuma", InstallOptions{}, "1.0.0")
	engine := &fakeEngine{containers: []ReconcileContainer{
		{Name: "uptime-kuma-uptime-kuma-1", Running: true},
		{Name: "uptime-kuma-sidecar-1", Running: false},
	}}
	reconciler := NewReconciler(store, engine, nil)
	if err := reconciler.Resync(context.Background()); err != nil {
		t.Fatal(err)
	}
	if got := instanceRuntime(t, store, "uptime-kuma"); got != RuntimeDegraded {
		t.Fatalf("runtime = %q", got)
	}
}

func TestResyncSkipsNonInstalledInstances(t *testing.T) {
	store := newMemoryStore()
	_ = store.UpsertInstance(context.Background(), Instance{
		ID: "draft", AppID: "draft", Status: InstanceInstalling, Runtime: "",
	})
	seedInstalled(store, "uptime-kuma", InstallOptions{}, "1.0.0")
	engine := &fakeEngine{containers: []ReconcileContainer{
		{Name: "uptime-kuma-uptime-kuma-1", Running: true},
		{Name: "draft-draft-1", Running: true},
	}}
	reconciler := NewReconciler(store, engine, nil)
	if err := reconciler.Resync(context.Background()); err != nil {
		t.Fatal(err)
	}
	if got := instanceRuntime(t, store, "uptime-kuma"); got != RuntimeRunning {
		t.Fatalf("installed runtime = %q", got)
	}
	if got := instanceRuntime(t, store, "draft"); got != "" {
		t.Fatalf("draft runtime changed to %q", got)
	}
}

func TestResyncReturnsListError(t *testing.T) {
	store := newMemoryStore()
	seedInstalled(store, "uptime-kuma", InstallOptions{}, "1.0.0")
	wantErr := errors.New("daemon indisponível")
	reconciler := NewReconciler(store, &fakeEngine{listErr: wantErr}, nil)
	if err := reconciler.Resync(context.Background()); !errors.Is(err, wantErr) {
		t.Fatalf("err = %v", err)
	}
	if got := instanceRuntime(t, store, "uptime-kuma"); got != RuntimeRunning {
		t.Fatalf("runtime should not change on list error, got %q", got)
	}
}

func TestRunTriggersResyncOnContainerEvent(t *testing.T) {
	store := &countingStore{memoryStore: newMemoryStore()}
	seedInstalled(store, "uptime-kuma", InstallOptions{}, "1.0.0")
	engine := &fakeEngine{
		containers: []ReconcileContainer{{Name: "uptime-kuma-uptime-kuma-1", Running: false}},
		events:     []ReconcileEvent{{Type: "container", Action: "die", Actor: "abc123"}},
	}
	reconciler := NewReconciler(store, engine, nil)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	result := make(chan error, 1)
	go func() { result <- reconciler.Run(ctx) }()

	waitUntil(t, "event resync", func() bool { return store.updates() >= 2 })
	if got := instanceRuntime(t, store, "uptime-kuma"); got != RuntimeStopped {
		t.Fatalf("runtime after die event = %q", got)
	}

	cancel()
	select {
	case err := <-result:
		if !errors.Is(err, context.Canceled) {
			t.Fatalf("Run err = %v", err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("Run did not return after cancel")
	}
}

func TestRunReturnsContextErrorOnCancellation(t *testing.T) {
	store := newMemoryStore()
	seedInstalled(store, "uptime-kuma", InstallOptions{}, "1.0.0")
	reconciler := NewReconciler(store, &fakeEngine{block: true}, nil)
	ctx, cancel := context.WithCancel(context.Background())

	result := make(chan error, 1)
	go func() { result <- reconciler.Run(ctx) }()
	// allow the initial resync and blocking stream to start before cancelling
	time.Sleep(50 * time.Millisecond)
	cancel()

	select {
	case err := <-result:
		if !errors.Is(err, context.Canceled) {
			t.Fatalf("Run err = %v", err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("Run did not return after cancel")
	}
}

func TestRunIgnoresNonContainerEvents(t *testing.T) {
	store := &countingStore{memoryStore: newMemoryStore()}
	seedInstalled(store, "uptime-kuma", InstallOptions{}, "1.0.0")
	engine := &fakeEngine{
		events: []ReconcileEvent{{Type: "network", Action: "connect"}},
	}
	reconciler := NewReconciler(store, engine, nil)
	ctx, cancel := context.WithCancel(context.Background())

	result := make(chan error, 1)
	go func() { result <- reconciler.Run(ctx) }()

	waitUntil(t, "retry loop", func() bool { return engine.streams() >= 2 })
	if got := store.updates(); got != 1 {
		t.Fatalf("runtime updates = %d, want only the initial resync", got)
	}

	cancel()
	select {
	case err := <-result:
		if !errors.Is(err, context.Canceled) {
			t.Fatalf("Run err = %v", err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("Run did not return after cancel")
	}
}
