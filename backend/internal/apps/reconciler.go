package apps

import (
	"context"
	"log/slog"
	"strings"
	"time"
)

const (
	reconcileInterval = 30 * time.Second
	streamRetryDelay  = 1 * time.Second
)

// ReconcileEvent is one raw docker engine event observed by the reconciler.
type ReconcileEvent struct {
	Type   string
	Action string
	Actor  string
}

// ReconcileContainer is one running container observed on the host, enough for
// the reconciler to derive a per-app runtime from the compose project naming
// (<project>-<service>-<index>). Name carries no leading slash.
type ReconcileContainer struct {
	Name    string
	Running bool
}

// Engine observes the container engine. StreamEvents blocks delivering engine
// events through emit until the stream ends or ctx is cancelled; List snapshots
// the current container state for a full resync.
type Engine interface {
	StreamEvents(ctx context.Context, emit func(ReconcileEvent) error) error
	List(ctx context.Context) ([]ReconcileContainer, error)
}

// Reconciler keeps per-app runtime status fresh by correlating installed
// instances with the containers running on the host. It is decoupled from any
// concrete container engine; a composer adapter supplies the Engine.
type Reconciler struct {
	store  Store
	engine Engine
	logger *slog.Logger
}

// NewReconciler wires the reconciler.
func NewReconciler(store Store, engine Engine, logger *slog.Logger) *Reconciler {
	return &Reconciler{
		store:  store,
		engine: engine,
		logger: logger,
	}
}

// Resync recomputes the runtime status of every installed instance from the
// current container snapshot and persists the result. It returns the first
// store or engine error encountered.
func (service *Reconciler) Resync(ctx context.Context) error {
	instances, err := service.store.ListInstances(ctx)
	if err != nil {
		return err
	}
	containers, err := service.engine.List(ctx)
	if err != nil {
		return err
	}
	for _, instance := range instances {
		if instance.Status != InstanceInstalled {
			continue
		}
		runtime := reconcileRuntime(instance.AppID, containers)
		if err := service.store.UpdateInstanceRuntime(ctx, instance.AppID, runtime, ""); err != nil {
			return err
		}
	}
	return nil
}

// reconcileRuntime derives the runtime status of one app: no matching
// container running is stopped, every matching container running is running,
// and a mix is degraded.
func reconcileRuntime(appID string, containers []ReconcileContainer) RuntimeStatus {
	prefix := strings.TrimPrefix(appID, "") + "-"
	running := 0
	total := 0
	for _, container := range containers {
		if !strings.HasPrefix(container.Name, prefix) {
			continue
		}
		total++
		if container.Running {
			running++
		}
	}
	switch {
	case running == 0:
		return RuntimeStopped
	case running == total:
		return RuntimeRunning
	default:
		return RuntimeDegraded
	}
}

// Run drives the reconcile loop: it resyncs, follows the engine event stream
// resyncing on every container event, and forces a resync every 30 seconds as
// a safety net. A stream or resync error is logged and retried after a short
// delay; context cancellation returns ctx.Err().
func (service *Reconciler) Run(ctx context.Context) error {
	if err := service.Resync(ctx); err != nil {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		service.warn("resync inicial falhou", "error", err)
	}

	ticker := time.NewTicker(reconcileInterval)
	defer ticker.Stop()
	for {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		err := service.engine.StreamEvents(ctx, func(event ReconcileEvent) error {
			if event.Type != "container" {
				return nil
			}
			return service.Resync(ctx)
		})
		if ctx.Err() != nil {
			return ctx.Err()
		}
		service.warn("stream de eventos do docker encerrado, reestabelecendo", "error", err)

		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			if resyncErr := service.Resync(ctx); resyncErr != nil && ctx.Err() == nil {
				service.warn("resync periódico falhou", "error", resyncErr)
			}
		case <-time.After(streamRetryDelay):
		}
	}
}

func (service *Reconciler) warn(message string, args ...any) {
	if service.logger != nil {
		service.logger.Warn(message, args...)
	}
}
