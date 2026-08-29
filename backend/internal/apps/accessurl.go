package apps

import (
	"context"
	"errors"
	"fmt"
	"strconv"

	"github.com/ipetinate/glass-stack/backend/internal/store"
)

// PortResolver returns the actual host-side published port of an app's
// entrypoint service, or ok=false when the app exposes no host port. It lets
// the install service render accurate access URLs without knowing how the
// port mapping is materialized (compose port options, host network, proxy).
type PortResolver func(ctx context.Context, appID string) (hostPort int, ok bool, err error)

// SetHostResolver sets the source of the host part of access URLs. When never
// set (or set to nil), AccessURL defaults the host to "localhost".
func (service *Installer) SetHostResolver(resolver func() string) {
	service.hostResolver = resolver
}

// SetPortResolver sets the source of an app's published host port.
func (service *Installer) SetPortResolver(resolver PortResolver) {
	service.portResolver = resolver
}

// AccessURL resolves the browser URL for an installed app. The port is picked
// in priority order from the port resolver, the persisted install options and
// the manifest's entrypoint port map; apps that expose no host port yield an
// empty URL with no error.
func (service *Installer) AccessURL(ctx context.Context, appID string) (string, error) {
	instance, err := service.store.LoadInstance(ctx, appID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return "", ErrNotInstalled
		}
		return "", fmt.Errorf("verificar instância: %w", err)
	}
	composeYAML, err := service.manifests.Manifest(ctx, appID)
	if err != nil {
		return "", translateManifestErr(err)
	}
	parsed, err := store.ParseManifest([]byte(composeYAML))
	if err != nil {
		return "", fmt.Errorf("manifesto inválido: %w", err)
	}

	port := 0
	if service.portResolver != nil {
		hostPort, ok, err := service.portResolver(ctx, appID)
		if err != nil {
			return "", fmt.Errorf("resolver porta publicada: %w", err)
		}
		if ok && hostPort > 0 {
			port = hostPort
		}
	}
	if port == 0 && instance.Options.Port > 0 {
		port = instance.Options.Port
	}
	if port == 0 && parsed.Entrypoint.PortMap != "" {
		if parsedPort, err := strconv.Atoi(parsed.Entrypoint.PortMap); err == nil {
			port = parsedPort
		}
	}
	if port == 0 {
		return "", nil
	}
	return buildAccessURL(parsed.Entrypoint.Scheme, service.accessHost(), port, parsed.Entrypoint.Index), nil
}

func (service *Installer) accessHost() string {
	if service.hostResolver != nil {
		return service.hostResolver()
	}
	return "localhost"
}

// buildAccessURL assembles scheme://host:port plus the entrypoint index path.
func buildAccessURL(scheme, host string, port int, index string) string {
	return fmt.Sprintf("%s://%s:%d%s", scheme, host, port, index)
}
