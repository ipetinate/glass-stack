package apps

import (
	"context"
	"errors"
	"time"
)

// InstanceStatus mirrors the app_instances.status vocabulary: installing,
// installed or error.
type InstanceStatus string

const (
	InstanceInstalling InstanceStatus = "installing"
	InstanceInstalled  InstanceStatus = "installed"
	InstanceError      InstanceStatus = "error"
)

// RuntimeStatus reports the observed runtime state of an installed app.
type RuntimeStatus string

const (
	RuntimeRunning  RuntimeStatus = "running"
	RuntimeStopped  RuntimeStatus = "stopped"
	RuntimeDegraded RuntimeStatus = "degraded"
)

// Instance is the durable state of one installed app.
type Instance struct {
	ID          string
	AppID       string
	Status      InstanceStatus
	ComposeHash string
	LastError   string
	Options     InstallOptions
	Version     string
	Runtime     RuntimeStatus
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

// Store persists app operations and instances. The concrete implementation
// lives in internal/platform/database; tests provide an in-memory fake.
type Store interface {
	CreateOperation(ctx context.Context, operation Operation) error
	UpdateOperation(ctx context.Context, operation Operation) error
	LoadOperation(ctx context.Context, id string) (Operation, error)
	UpsertInstance(ctx context.Context, instance Instance) error
	LoadInstance(ctx context.Context, appID string) (Instance, error)
	ListInstances(ctx context.Context) ([]Instance, error)
	DeleteInstance(ctx context.Context, appID string) error
	UpdateInstanceRuntime(ctx context.Context, appID string, runtime RuntimeStatus, lastError string) error
}

// ErrNotFound reports an operation or instance the store does not know.
var ErrNotFound = errors.New("registro não encontrado")

// ManifestSource provides the raw docker-compose manifest for an app and is
// implemented by store.Service.
type ManifestSource interface {
	Manifest(ctx context.Context, appID string) (string, error)
}
