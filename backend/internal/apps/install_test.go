package apps

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/ipetinate/glass-stack/backend/internal/events"
)

// memoryStore is an in-memory Store faking the persisted operations+instances.
type memoryStore struct {
	mu        sync.Mutex
	ops       map[string]Operation
	instances map[string]Instance
}

func newMemoryStore() *memoryStore {
	return &memoryStore{ops: map[string]Operation{}, instances: map[string]Instance{}}
}

func (store *memoryStore) CreateOperation(_ context.Context, operation Operation) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	store.ops[operation.ID] = operation
	return nil
}

func (store *memoryStore) UpdateOperation(_ context.Context, operation Operation) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	store.ops[operation.ID] = operation
	return nil
}

func (store *memoryStore) LoadOperation(_ context.Context, id string) (Operation, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	operation, ok := store.ops[id]
	if !ok {
		return Operation{}, ErrNotFound
	}
	return operation, nil
}

func (store *memoryStore) UpsertInstance(_ context.Context, instance Instance) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	store.instances[instance.AppID] = instance
	return nil
}

func (store *memoryStore) LoadInstance(_ context.Context, appID string) (Instance, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	instance, ok := store.instances[appID]
	if !ok {
		return Instance{}, ErrNotFound
	}
	return instance, nil
}

func (store *memoryStore) ListInstances(_ context.Context) ([]Instance, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	instances := make([]Instance, 0, len(store.instances))
	for _, instance := range store.instances {
		instances = append(instances, instance)
	}
	return instances, nil
}

func (store *memoryStore) DeleteInstance(_ context.Context, appID string) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	if _, ok := store.instances[appID]; !ok {
		return ErrNotFound
	}
	delete(store.instances, appID)
	return nil
}

func (store *memoryStore) UpdateInstanceRuntime(
	_ context.Context,
	appID string,
	runtime RuntimeStatus,
	lastError string,
) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	instance, ok := store.instances[appID]
	if !ok {
		return ErrNotFound
	}
	instance.Runtime = runtime
	instance.LastError = lastError
	store.instances[appID] = instance
	return nil
}

// fakeManifests serves manifest YAML by app id.
type fakeManifests struct {
	compose map[string]string
}

func (source fakeManifests) Manifest(_ context.Context, appID string) (string, error) {
	manifest, ok := source.compose[appID]
	if !ok {
		return "", ErrApplicationNotFound
	}
	return manifest, nil
}

// fakeRunner records Apply/down/image calls and serves configurable status
// states. Writes may happen from an async executor goroutine, so the recording
// fields are mutex-guarded and read via the accessors.
type fakeRunner struct {
	mu            sync.Mutex
	applyCalls    int
	applyErr      error
	output        string
	states        []ServiceStatus
	statusErr     error
	available     bool
	downCalls     []bool
	downErr       error
	removedImages []string
	removeErr     error
}

func (runner *fakeRunner) Apply(_ context.Context, projectDir string) (string, error) {
	runner.mu.Lock()
	runner.applyCalls++
	applyErr := runner.applyErr
	output := runner.output
	runner.mu.Unlock()
	if applyErr != nil {
		return "", applyErr
	}
	return output, nil
}

func (runner *fakeRunner) Down(_ context.Context, projectDir string, removeVolumes bool) error {
	runner.mu.Lock()
	runner.downCalls = append(runner.downCalls, removeVolumes)
	downErr := runner.downErr
	runner.mu.Unlock()
	if downErr != nil {
		return downErr
	}
	return nil
}

func (runner *fakeRunner) RemoveImage(_ context.Context, image string) error {
	runner.mu.Lock()
	runner.removedImages = append(runner.removedImages, image)
	removeErr := runner.removeErr
	runner.mu.Unlock()
	if removeErr != nil {
		return removeErr
	}
	return nil
}

func (runner *fakeRunner) Status(_ context.Context, _ string) ([]ServiceStatus, error) {
	runner.mu.Lock()
	defer runner.mu.Unlock()
	if runner.statusErr != nil {
		return nil, runner.statusErr
	}
	return runner.states, nil
}

func (runner *fakeRunner) Available() bool {
	return runner.available
}

func (runner *fakeRunner) applyCount() int {
	runner.mu.Lock()
	defer runner.mu.Unlock()
	return runner.applyCalls
}

func (runner *fakeRunner) downs() []bool {
	runner.mu.Lock()
	defer runner.mu.Unlock()
	return append([]bool(nil), runner.downCalls...)
}

func (runner *fakeRunner) images() []string {
	runner.mu.Lock()
	defer runner.mu.Unlock()
	return append([]string(nil), runner.removedImages...)
}

type fakePublisher struct {
	mu     sync.Mutex
	events []string
}

func (publisher *fakePublisher) Publish(_ context.Context, event events.Event) error {
	publisher.mu.Lock()
	publisher.events = append(publisher.events, event.Type)
	publisher.mu.Unlock()
	return nil
}

func (publisher *fakePublisher) types() []string {
	publisher.mu.Lock()
	defer publisher.mu.Unlock()
	return append([]string(nil), publisher.events...)
}

func (publisher *fakePublisher) published(eventType string) bool {
	for _, t := range publisher.types() {
		if t == eventType {
			return true
		}
	}
	return false
}

// waitFor polls cond (which reads only via thread-safe accessors) until it
// returns true or the deadline elapses. The async executors publish side
// effects after writing the terminal operation status, so callers must await
// those side effects rather than read the operation alone.
func waitFor(t *testing.T, what string, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
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

func fixedService(
	store Store,
	runner Runner,
	projectRoot string,
	publisher events.Publisher,
) *Installer {
	service := NewInstaller(
		store,
		fakeManifests{compose: map[string]string{"uptime-kuma": fixtureCompose}},
		runner,
		projectRoot,
		publisher,
		nil,
	)
	service.slackSeconds = 0
	return service
}

func TestInstallValidates(t *testing.T) {
	_, err := fixedService(newMemoryStore(), nil, "", nil).Install(
		context.Background(),
		InstallRequest{AppID: "Bad ID", Options: InstallOptions{Port: 1}},
	)
	if !errors.Is(err, ErrInvalidOptions) {
		t.Fatalf("err = %v", err)
	}

	_, err = fixedService(newMemoryStore(), nil, "", nil).Install(
		context.Background(),
		InstallRequest{AppID: "uptime-kuma", Mode: "podman"},
	)
	if !errors.Is(err, ErrUnsupportedMode) {
		t.Fatalf("err = %v", err)
	}

	for _, mode := range []string{"", "standard", "custom", "docker"} {
		operation, err := fixedService(newMemoryStore(), &fakeRunner{}, "", nil).Install(
			context.Background(),
			InstallRequest{AppID: "uptime-kuma", Mode: mode},
		)
		if err != nil {
			t.Fatalf("mode %q err = %v", mode, err)
		}
		if operation.Status != OperationQueued {
			t.Fatalf("mode %q operation = %+v", mode, operation)
		}
	}
}

func TestInstallQueuesAndGuards(t *testing.T) {
	store := newMemoryStore()
	service := fixedService(store, &fakeRunner{}, "", nil)

	operation, err := service.Install(context.Background(), InstallRequest{AppID: "uptime-kuma", Mode: "docker"})
	if err != nil {
		t.Fatal(err)
	}
	if operation.Status != OperationQueued || operation.Progress != 0 {
		t.Fatalf("operation = %+v", operation)
	}
	loaded, err := store.LoadOperation(context.Background(), operation.ID)
	if err != nil || loaded.Status != OperationQueued {
		t.Fatalf("loaded = %+v, err = %v", loaded, err)
	}
}

func TestInstallRejectsAlreadyInstalled(t *testing.T) {
	store := newMemoryStore()
	if err := store.UpsertInstance(context.Background(), Instance{
		ID: "uptime-kuma", AppID: "uptime-kuma", Status: InstanceInstalled,
	}); err != nil {
		t.Fatal(err)
	}
	if _, err := fixedService(store, nil, "", nil).Install(
		context.Background(),
		InstallRequest{AppID: "uptime-kuma"},
	); !errors.Is(err, ErrAlreadyInstalled) {
		t.Fatalf("err = %v", err)
	}
}

func TestInstallRejectsInProgress(t *testing.T) {
	store := newMemoryStore()
	if err := store.UpsertInstance(context.Background(), Instance{
		ID: "uptime-kuma", AppID: "uptime-kuma", Status: InstanceInstalling,
	}); err != nil {
		t.Fatal(err)
	}
	if _, err := fixedService(store, nil, "", nil).Install(
		context.Background(),
		InstallRequest{AppID: "uptime-kuma"},
	); !errors.Is(err, ErrInstallInProgress) {
		t.Fatalf("err = %v", err)
	}
}

func TestExecuteInstallSuccess(t *testing.T) {
	store := newMemoryStore()
	projectRoot := t.TempDir()
	publisher := &fakePublisher{}
	runner := &fakeRunner{
		states: []ServiceStatus{{Name: "uptime-kuma-1", State: "running", Health: "healthy"}},
	}
	service := fixedService(store, runner, projectRoot, publisher)

	operation := Operation{
		ID:        "op-success",
		AppID:     "uptime-kuma",
		Kind:      OperationKindInstall,
		Status:    OperationQueued,
		Progress:  0,
		Message:   "fila",
		CreatedAt: time.Now().UTC(),
	}
	if err := store.CreateOperation(context.Background(), operation); err != nil {
		t.Fatal(err)
	}

	service.executeInstall(operation.ID, InstallRequest{AppID: "uptime-kuma", Mode: "docker"})

	loaded, err := store.LoadOperation(context.Background(), operation.ID)
	if err != nil {
		t.Fatal(err)
	}
	if loaded.Status != OperationSucceeded || loaded.Progress != 100 {
		t.Fatalf("loaded = %+v", loaded)
	}

	instance, err := store.LoadInstance(context.Background(), "uptime-kuma")
	if err != nil {
		t.Fatal(err)
	}
	if instance.Status != InstanceInstalled || instance.ComposeHash == "" {
		t.Fatalf("instance = %+v", instance)
	}

	if runner.applyCount() != 1 {
		t.Fatalf("applyCalls = %d", runner.applyCount())
	}
	composeFile, err := os.ReadFile(filepath.Join(projectRoot, "uptime-kuma", "docker-compose.yaml"))
	if err != nil {
		t.Fatal(err)
	}
	if string(composeFile) != fixtureCompose {
		t.Fatalf("written compose differs:\n%s", composeFile)
	}

	if events := publisher.types(); !publisher.published("glass.apps.operation") ||
		!publisher.published("glass.apps.installed") {
		t.Fatalf("events = %v", events)
	}
	if last := publisher.types()[len(publisher.types())-1]; last != "glass.apps.installed" {
		t.Fatalf("last event = %s", last)
	}
}

func TestExecuteInstallApplyFailure(t *testing.T) {
	store := newMemoryStore()
	service := fixedService(
		store,
		&fakeRunner{applyErr: errors.New("daemon unreachable")},
		t.TempDir(),
		nil,
	)
	operation := Operation{
		ID:        "op-fail",
		AppID:     "uptime-kuma",
		Kind:      OperationKindInstall,
		Status:    OperationQueued,
		CreatedAt: time.Now().UTC(),
	}
	if err := store.CreateOperation(context.Background(), operation); err != nil {
		t.Fatal(err)
	}

	service.executeInstall(operation.ID, InstallRequest{AppID: "uptime-kuma"})

	loaded, err := store.LoadOperation(context.Background(), operation.ID)
	if err != nil {
		t.Fatal(err)
	}
	if loaded.Status != OperationFailed || !strings.Contains(loaded.Error, "daemon unreachable") {
		t.Fatalf("loaded = %+v", loaded)
	}
	instance, err := store.LoadInstance(context.Background(), "uptime-kuma")
	if err != nil || instance.Status != InstanceError {
		t.Fatalf("instance = %+v, err = %v", instance, err)
	}
}

func TestExecuteInstallHealthTimeout(t *testing.T) {
	store := newMemoryStore()
	service := fixedService(
		store,
		&fakeRunner{states: []ServiceStatus{{Name: "uptime-kuma-1", State: "exited"}}},
		t.TempDir(),
		nil,
	)
	operation := Operation{
		ID:        "op-timeout",
		AppID:     "uptime-kuma",
		Kind:      OperationKindInstall,
		Status:    OperationQueued,
		CreatedAt: time.Now().UTC(),
	}
	if err := store.CreateOperation(context.Background(), operation); err != nil {
		t.Fatal(err)
	}

	service.executeInstall(operation.ID, InstallRequest{AppID: "uptime-kuma"})

	loaded, err := store.LoadOperation(context.Background(), operation.ID)
	if err != nil {
		t.Fatal(err)
	}
	if loaded.Status != OperationFailed || !strings.Contains(loaded.Error, "tempo esgotado") {
		t.Fatalf("loaded = %+v", loaded)
	}
}

func TestProjectOperation(t *testing.T) {
	queued := Operation{ID: "1", AppID: "a", Status: OperationQueued, Progress: 0}
	if projected := ProjectOperation(queued); projected.Status != "installing" {
		t.Fatalf("projected = %+v", projected)
	}
	failed := Operation{ID: "2", AppID: "a", Status: OperationFailed, Progress: 40, Error: "boom"}
	if projected := ProjectOperation(failed); projected.Status != "error" || projected.Message != "boom" {
		t.Fatalf("projected = %+v", projected)
	}
	succeeded := Operation{ID: "3", AppID: "a", Status: OperationSucceeded, Progress: 100}
	if projected := ProjectOperation(succeeded); projected.Status != "installed" {
		t.Fatalf("projected = %+v", projected)
	}
}

// seedInstalled writes a persisted installed instance for appID.
func seedInstalled(store Store, appID string, options InstallOptions, version string) {
	_ = store.UpsertInstance(context.Background(), Instance{
		ID:          appID,
		AppID:       appID,
		Status:      InstanceInstalled,
		ComposeHash: "oldhash",
		Options:     options,
		Version:     version,
		Runtime:     RuntimeRunning,
		CreatedAt:   time.Now().UTC(),
		UpdatedAt:   time.Now().UTC(),
	})
}

// waitForFinalOperation polls the store until an operation reaches a terminal
// state, since Update/Edit/Remove advance asynchronously.
func waitForFinalOperation(t *testing.T, store Store, id string) Operation {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	for {
		operation, err := store.LoadOperation(context.Background(), id)
		if err != nil {
			t.Fatal(err)
		}
		if IsFinal(operation.Status) {
			return operation
		}
		if time.Now().After(deadline) {
			t.Fatalf("operation %s never reached a terminal state: %+v", id, operation)
		}
		time.Sleep(5 * time.Millisecond)
	}
}

func TestUpdateNotInstalled(t *testing.T) {
	service := fixedService(newMemoryStore(), &fakeRunner{}, t.TempDir(), nil)
	if _, err := service.Update(context.Background(), "uptime-kuma"); !errors.Is(err, ErrNotInstalled) {
		t.Fatalf("err = %v", err)
	}
}

func TestUpdateRejectsInProgress(t *testing.T) {
	store := newMemoryStore()
	_ = store.UpsertInstance(context.Background(), Instance{
		ID: "uptime-kuma", AppID: "uptime-kuma", Status: InstanceInstalling,
	})
	service := fixedService(store, &fakeRunner{}, t.TempDir(), nil)
	if _, err := service.Update(context.Background(), "uptime-kuma"); !errors.Is(err, ErrUpdateInProgress) {
		t.Fatalf("err = %v", err)
	}
}

func TestUpdateRePlansFromPersistedOptions(t *testing.T) {
	store := newMemoryStore()
	projectRoot := t.TempDir()
	publisher := &fakePublisher{}
	seedInstalled(store, "uptime-kuma", InstallOptions{Port: 8080, Volume: "vol"}, "1.0.0")
	runner := &fakeRunner{
		states: []ServiceStatus{{Name: "uptime-kuma-1", State: "running", Health: "healthy"}},
	}
	service := fixedService(store, runner, projectRoot, publisher)

	operation, err := service.Update(context.Background(), "uptime-kuma")
	if err != nil {
		t.Fatal(err)
	}
	if operation.Kind != OperationKindUpdate || operation.Status != OperationQueued {
		t.Fatalf("operation = %+v", operation)
	}

	loaded := waitForFinalOperation(t, store, operation.ID)
	if loaded.Status != OperationSucceeded || loaded.Progress != 100 {
		t.Fatalf("loaded = %+v", loaded)
	}
	waitFor(t, "update event", func() bool { return publisher.published("glass.apps.updated") })

	instance, err := store.LoadInstance(context.Background(), "uptime-kuma")
	if err != nil {
		t.Fatal(err)
	}
	if instance.Version != "1.23.16" {
		t.Fatalf("version = %q", instance.Version)
	}
	if instance.Options.Port != 8080 || instance.Options.Volume != "vol" {
		t.Fatalf("options = %+v", instance.Options)
	}
	if instance.Runtime != RuntimeRunning {
		t.Fatalf("runtime = %q", instance.Runtime)
	}
	if instance.ComposeHash == "oldhash" {
		t.Fatal("compose hash did not update")
	}

	composeFile, err := os.ReadFile(filepath.Join(projectRoot, "uptime-kuma", "docker-compose.yaml"))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(composeFile), "8080:3001") {
		t.Fatalf("re-plan did not use persisted port option:\n%s", composeFile)
	}
}

func TestEditModeValidation(t *testing.T) {
	for _, mode := range []string{"", "standard", "custom", "docker"} {
		store := newMemoryStore()
		seedInstalled(store, "uptime-kuma", InstallOptions{}, "1.0.0")
		service := fixedService(store, &fakeRunner{}, t.TempDir(), nil)
		operation, err := service.Edit(context.Background(), "uptime-kuma", mode, InstallOptions{})
		if err != nil {
			t.Fatalf("mode %q err = %v", mode, err)
		}
		waitForFinalOperation(t, store, operation.ID)
	}
	if _, err := fixedService(newMemoryStore(), &fakeRunner{}, t.TempDir(), nil).Edit(
		context.Background(), "uptime-kuma", "podman", InstallOptions{},
	); !errors.Is(err, ErrUnsupportedMode) {
		t.Fatalf("err = %v", err)
	}
}

func TestEditNotInstalled(t *testing.T) {
	service := fixedService(newMemoryStore(), &fakeRunner{}, t.TempDir(), nil)
	if _, err := service.Edit(context.Background(), "uptime-kuma", "standard", InstallOptions{}); !errors.Is(err, ErrNotInstalled) {
		t.Fatalf("err = %v", err)
	}
}

func TestEditRejectsInProgress(t *testing.T) {
	store := newMemoryStore()
	_ = store.UpsertInstance(context.Background(), Instance{
		ID: "uptime-kuma", AppID: "uptime-kuma", Status: InstanceInstalling,
	})
	service := fixedService(store, &fakeRunner{}, t.TempDir(), nil)
	if _, err := service.Edit(context.Background(), "uptime-kuma", "standard", InstallOptions{}); !errors.Is(err, ErrEditInProgress) {
		t.Fatalf("err = %v", err)
	}
}

func TestEditPersistsNewOptions(t *testing.T) {
	store := newMemoryStore()
	publisher := &fakePublisher{}
	seedInstalled(store, "uptime-kuma", InstallOptions{Port: 8080}, "1.0.0")
	runner := &fakeRunner{
		states: []ServiceStatus{{Name: "uptime-kuma-1", State: "running", Health: "healthy"}},
	}
	service := fixedService(store, runner, t.TempDir(), publisher)

	operation, err := service.Edit(context.Background(), "uptime-kuma", "custom", InstallOptions{Port: 9090, Volume: "new-vol"})
	if err != nil {
		t.Fatal(err)
	}
	if operation.Kind != OperationKindEdit {
		t.Fatalf("operation = %+v", operation)
	}

	loaded := waitForFinalOperation(t, store, operation.ID)
	if loaded.Status != OperationSucceeded {
		t.Fatalf("loaded = %+v", loaded)
	}
	waitFor(t, "edited event", func() bool { return publisher.published("glass.apps.edited") })

	instance, err := store.LoadInstance(context.Background(), "uptime-kuma")
	if err != nil {
		t.Fatal(err)
	}
	if instance.Options.Port != 9090 || instance.Options.Volume != "new-vol" {
		t.Fatalf("options = %+v", instance.Options)
	}
	if instance.Version != "1.23.16" {
		t.Fatalf("version = %q", instance.Version)
	}
}

func TestRemoveNeedsConfirmation(t *testing.T) {
	store := newMemoryStore()
	seedInstalled(store, "uptime-kuma", InstallOptions{}, "1.0.0")
	service := fixedService(store, &fakeRunner{}, t.TempDir(), nil)
	if _, err := service.Remove(context.Background(), RemoveRequest{}); !errors.Is(err, ErrRemoveNeedsConfirmation) {
		t.Fatalf("err = %v", err)
	}
}

func TestRemoveNotInstalled(t *testing.T) {
	service := fixedService(newMemoryStore(), &fakeRunner{}, t.TempDir(), nil)
	if _, err := service.Remove(context.Background(), RemoveRequest{AppID: "uptime-kuma", Containers: true}); !errors.Is(err, ErrNotInstalled) {
		t.Fatalf("err = %v", err)
	}
}

func TestRemoveExecutesAndDeletesInstance(t *testing.T) {
	store := newMemoryStore()
	projectRoot := t.TempDir()
	publisher := &fakePublisher{}
	seedInstalled(store, "uptime-kuma", InstallOptions{}, "1.0.0")

	projectDir := filepath.Join(projectRoot, "uptime-kuma")
	if err := os.MkdirAll(projectDir, 0o755); err != nil {
		t.Fatal(err)
	}
	dataDir := filepath.Join(filepath.Dir(projectRoot), "uptime-kuma")
	if err := os.MkdirAll(dataDir, 0o755); err != nil {
		t.Fatal(err)
	}

	runner := &fakeRunner{}
	service := fixedService(store, runner, projectRoot, publisher)

	operation, err := service.Remove(context.Background(), RemoveRequest{
		AppID:      "uptime-kuma",
		Containers: true,
		Images:     true,
		Config:     true,
		Data:       true,
	})
	if err != nil {
		t.Fatal(err)
	}
	if operation.Kind != OperationKindRemove {
		t.Fatalf("operation = %+v", operation)
	}

	loaded := waitForFinalOperation(t, store, operation.ID)
	if loaded.Status != OperationSucceeded {
		t.Fatalf("loaded = %+v", loaded)
	}
	waitFor(t, "removed event", func() bool { return publisher.published("glass.apps.removed") })

	if downs := runner.downs(); len(downs) != 1 || !downs[0] {
		t.Fatalf("downCalls = %v", downs)
	}
	if images := runner.images(); len(images) != 1 || images[0] != "louislam/uptime-kuma:1.23.16" {
		t.Fatalf("removedImages = %v", images)
	}

	if _, err := os.Stat(projectDir); !os.IsNotExist(err) {
		t.Fatalf("project dir still exists: %v", err)
	}
	if _, err := os.Stat(dataDir); !os.IsNotExist(err) {
		t.Fatalf("data dir still exists: %v", err)
	}

	if _, err := store.LoadInstance(context.Background(), "uptime-kuma"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("instance not deleted, err = %v", err)
	}
}

func TestRemoveRequiresContainers(t *testing.T) {
	store := newMemoryStore()
	seedInstalled(store, "uptime-kuma", InstallOptions{}, "1.0.0")
	runner := &fakeRunner{}
	service := fixedService(store, runner, t.TempDir(), nil)
	operation, err := service.Remove(context.Background(), RemoveRequest{AppID: "uptime-kuma", Images: true})
	if err != nil {
		t.Fatal(err)
	}
	loaded := waitForFinalOperation(t, store, operation.ID)
	if loaded.Status != OperationSucceeded {
		t.Fatalf("loaded = %+v", loaded)
	}
	if downs := runner.downs(); len(downs) != 0 {
		t.Fatalf("down should not be called when Containers is false, downCalls = %v", downs)
	}
}
