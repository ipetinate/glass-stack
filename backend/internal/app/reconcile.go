package app

import (
	"context"
	"net/url"
	"strconv"
	"strings"

	"github.com/ipetinate/glass-stack/backend/internal/apps"
	"github.com/ipetinate/glass-stack/backend/internal/containers"
	dockeradapter "github.com/ipetinate/glass-stack/backend/internal/docker"
	"github.com/ipetinate/glass-stack/backend/internal/store"
)

// reconcilerEngine adapts the containers service to the reconciler engine
// contract, decoupling the apps package from the docker adapter.
type reconcilerEngine struct {
	containers *containers.Service
}

func (engine *reconcilerEngine) StreamEvents(
	ctx context.Context,
	emit func(apps.ReconcileEvent) error,
) error {
	return engine.containers.StreamEvents(ctx, func(event dockeradapter.EventMessage) error {
		return emit(apps.ReconcileEvent{
			Type:   event.Type,
			Action: event.Action,
			Actor:  event.Actor,
		})
	})
}

func (engine *reconcilerEngine) List(ctx context.Context) ([]apps.ReconcileContainer, error) {
	records, err := engine.containers.List(ctx)
	if err != nil {
		return nil, err
	}
	containersList := make([]apps.ReconcileContainer, 0, len(records))
	for _, record := range records {
		containersList = append(containersList, apps.ReconcileContainer{
			Name:    strings.TrimPrefix(record.Name, "/"),
			Running: record.State == "running",
		})
	}
	return containersList, nil
}

// accessHost resolves the host part of app access URLs, preferring the
// configured public URL hostname and falling back to localhost.
func accessHost(publicURL string) func() string {
	return func() string {
		parsed, err := url.Parse(publicURL)
		if err != nil || parsed.Hostname() == "" {
			return "localhost"
		}
		return parsed.Hostname()
	}
}

// accessPort builds the port resolver that reads the host-side published port
// of an app's entrypoint service from live containers, matching the manifest
// port map when present.
func accessPort(
	containersService *containers.Service,
	storeService *store.Service,
) apps.PortResolver {
	return func(ctx context.Context, appID string) (int, bool, error) {
		records, err := containersService.List(ctx)
		if err != nil {
			return 0, false, err
		}
		target := 0
		if raw, err := storeService.Manifest(ctx, appID); err == nil {
			if parsed, err := store.ParseManifest([]byte(raw)); err == nil {
				if port, err := strconv.Atoi(parsed.Entrypoint.PortMap); err == nil {
					target = port
				}
			}
		}
		prefix := appID + "-"
		for _, record := range records {
			if !strings.HasPrefix(record.Name, prefix) {
				continue
			}
			for _, binding := range record.Ports {
				if binding.HostPort == "" {
					continue
				}
				if target != 0 && int(binding.ContainerPort) != target {
					continue
				}
				if hostPort, err := strconv.Atoi(binding.HostPort); err == nil {
					return hostPort, true, nil
				}
			}
		}
		return 0, false, nil
	}
}
