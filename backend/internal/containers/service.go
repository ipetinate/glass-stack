// Package containers is the domain service over the Docker adapter: it owns
// the connection lifecycle (lazy connect, auto-reconnect), the capability
// snapshot, and the normalized inventory exposed to the HTTP layer.
package containers

import (
	"context"
	"errors"
	"fmt"
	"sync"

	"github.com/ipetinate/glass-stack/backend/internal/docker"
)

// Engine is the read/control surface the service depends on. The concrete
// implementation lives in internal/docker; tests provide a fake.
type Engine interface {
	Ping(context.Context) error
	Info(context.Context) (docker.EngineInfo, error)
	ListContainers(context.Context) ([]docker.ContainerRecord, error)
	InspectContainer(context.Context, string) (docker.ContainerDetail, error)
	ContainerStart(context.Context, string) error
	ContainerStop(context.Context, string) error
	ContainerRestart(context.Context, string) error
	ContainerLogs(context.Context, string, docker.LogQuery) ([]docker.LogLine, error)
	ContainerLogStream(context.Context, string, docker.LogQuery, func(docker.LogLine) error) error
	ContainerStats(context.Context, string) (docker.ContainerStats, error)
	EngineEvents(context.Context, func(docker.EventMessage) error) error
}

// LifecycleAction is the audited container lifecycle operation requested by a
// user. Actions map 1:1 to engine operations.
type LifecycleAction string

const (
	LifecycleStart   LifecycleAction = "start"
	LifecycleStop    LifecycleAction = "stop"
	LifecycleRestart LifecycleAction = "restart"
)

// Service connects to the Docker engine on demand and reconnects when the
// engine becomes unreachable, so the status bar always reports the current
// truth without requiring a daemon restart.
type Service struct {
	mu               sync.Mutex
	engine           Engine
	dial             func() (Engine, error)
	composeAvailable bool
}

var errNoDialer = errors.New("docker adapter has no engine dialer configured")

// New builds a Service. dial must return a fresh Engine (e.g. an adapter that
// probes GLASS_DOCKER_HOST / DOCKER_HOST / platform sockets); composeAvailable
// reflects whether the docker compose plugin is usable for apply operations.
func New(dial func() (Engine, error), composeAvailable bool) *Service {
	return &Service{dial: dial, composeAvailable: composeAvailable}
}

// Status never fails: it always returns a snapshot with Connected and,
// when unreachable, a useful Error.
func (service *Service) Status(ctx context.Context) docker.EngineStatus {
	engine, err := service.engineOrConnect(ctx)
	if err != nil {
		return docker.EngineStatus{
			Connected:        false,
			ComposeAvailable: service.composeAvailable,
			Error:            err.Error(),
		}
	}
	if err := engine.Ping(ctx); err != nil {
		service.invalidate()
		return docker.EngineStatus{
			Connected:        false,
			ComposeAvailable: service.composeAvailable,
			Error:            err.Error(),
		}
	}
	info, err := engine.Info(ctx)
	if err != nil {
		service.invalidate()
		return docker.EngineStatus{
			Connected:        false,
			ComposeAvailable: service.composeAvailable,
			Error:            err.Error(),
		}
	}
	return docker.EngineStatus{
		Connected:         true,
		ServerVersion:     info.ServerVersion,
		APIVersion:        info.APIVersion,
		Architecture:      info.Architecture,
		OS:                info.OS,
		ComposeAvailable:  service.composeAvailable,
		ContainersTotal:   info.ContainersTotal,
		ContainersRunning: info.ContainersRunning,
	}
}

// List returns the normalized container inventory or an error when the engine
// is unreachable.
func (service *Service) List(ctx context.Context) ([]docker.ContainerRecord, error) {
	engine, err := service.engineOrConnect(ctx)
	if err != nil {
		return nil, err
	}
	records, err := engine.ListContainers(ctx)
	if err != nil {
		service.invalidate()
		return nil, err
	}
	return records, nil
}

// engineOrConnect returns the cached engine or establishes and caches a new
// connection. A failed operation invalidates the cache so the next call
// reconnects.
func (service *Service) engineOrConnect(ctx context.Context) (Engine, error) {
	service.mu.Lock()
	defer service.mu.Unlock()

	if service.engine != nil {
		return service.engine, nil
	}
	if service.dial == nil {
		return nil, errNoDialer
	}
	engine, err := service.dial()
	if err != nil {
		return nil, err
	}
	service.engine = engine
	return engine, nil
}

func (service *Service) invalidate() {
	service.mu.Lock()
	defer service.mu.Unlock()
	service.engine = nil
}

// Detail returns the normalized detail for one container.
func (service *Service) Detail(ctx context.Context, id string) (docker.ContainerDetail, error) {
	engine, err := service.engineOrConnect(ctx)
	if err != nil {
		return docker.ContainerDetail{}, err
	}
	detail, err := engine.InspectContainer(ctx, id)
	if err != nil {
		service.invalidate()
		return docker.ContainerDetail{}, err
	}
	return detail, nil
}

// Lifecycle applies a start/stop/restart action to a container.
func (service *Service) Lifecycle(ctx context.Context, action LifecycleAction, id string) error {
	engine, err := service.engineOrConnect(ctx)
	if err != nil {
		return err
	}
	switch action {
	case LifecycleStart:
		err = engine.ContainerStart(ctx, id)
	case LifecycleStop:
		err = engine.ContainerStop(ctx, id)
	case LifecycleRestart:
		err = engine.ContainerRestart(ctx, id)
	default:
		return fmt.Errorf("unsupported container lifecycle action %q", action)
	}
	if err != nil {
		service.invalidate()
		return err
	}
	return nil
}

// Logs returns recent normalized log lines for a container.
func (service *Service) Logs(ctx context.Context, id string, query docker.LogQuery) ([]docker.LogLine, error) {
	engine, err := service.engineOrConnect(ctx)
	if err != nil {
		return nil, err
	}
	lines, err := engine.ContainerLogs(ctx, id, query)
	if err != nil {
		service.invalidate()
		return nil, err
	}
	return lines, nil
}

// StreamLogs follows a container's logs, forwarding each normalized line to
// emit until the context is cancelled or emit fails.
func (service *Service) StreamLogs(
	ctx context.Context,
	id string,
	query docker.LogQuery,
	emit func(docker.LogLine) error,
) error {
	engine, err := service.engineOrConnect(ctx)
	if err != nil {
		return err
	}
	return engine.ContainerLogStream(ctx, id, query, emit)
}

// Stats returns a point-in-time resource snapshot for one container.
func (service *Service) Stats(
	ctx context.Context,
	id string,
) (docker.ContainerStats, error) {
	engine, err := service.engineOrConnect(ctx)
	if err != nil {
		return docker.ContainerStats{}, err
	}
	stats, err := engine.ContainerStats(ctx, id)
	if err != nil {
		service.invalidate()
		return docker.ContainerStats{}, err
	}
	return stats, nil
}

// StreamEvents follows the engine's event stream, forwarding each normalized
// event to emit until the context is cancelled or emit fails.
func (service *Service) StreamEvents(
	ctx context.Context,
	emit func(docker.EventMessage) error,
) error {
	engine, err := service.engineOrConnect(ctx)
	if err != nil {
		return err
	}
	return engine.EngineEvents(ctx, emit)
}
