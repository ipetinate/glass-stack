package apps

import (
	"context"
	"fmt"

	"github.com/goccy/go-yaml"

	"github.com/ipetinate/glass-stack/backend/internal/store"
)

// Plan is a validated, option-rendered compose project ready to be written to
// disk and applied by the Runner.
type Plan struct {
	AppID   string
	Version string
	Compose []byte
}

// InstallOptions mirrors the install endpoint contract: an optional host port
// to publish for the entrypoint service and an optional volume name to
// substitute for the app's declared volumes.
type InstallOptions struct {
	Port   int    `json:"port"`
	Volume string `json:"volume"`
}

// Plan renders an app manifest for installation.
func (service *Installer) Plan(ctx context.Context, appID string, options InstallOptions) (Plan, error) {
	composeYAML, err := service.manifests.Manifest(ctx, appID)
	if err != nil {
		return Plan{}, translateManifestErr(err)
	}
	parsed, err := store.ParseManifest([]byte(composeYAML))
	if err != nil {
		return Plan{}, fmt.Errorf("manifesto inválido: %w", err)
	}
	if parsed.ID != appID {
		return Plan{}, fmt.Errorf("manifesto divergente do app solicitado: %q", parsed.ID)
	}
	rendered, err := renderCompose([]byte(composeYAML), parsed, options)
	if err != nil {
		return Plan{}, err
	}
	return Plan{
		AppID:   appID,
		Version: parsed.Version,
		Compose: rendered,
	}, nil
}

func translateManifestErr(err error) error {
	if err == store.ErrApplicationNotFound {
		return ErrApplicationNotFound
	}
	return fmt.Errorf("ler manifesto: %w", err)
}

// renderCompose validates that the plan can be materialized and, when options
// are present, surgically rewrites the compose document:
//   - options.Port > 0 publishes container:(entrypoint.portMap) on the
//     entrypoint service, requiring the manifest to declare entrypoint.portMap;
//   - options.Volume != "" retargets every declared top-level named volume to
//     that name, requiring the manifest to declare at least one volume.
//
// The original document is returned untouched when no options are set.
func renderCompose(data []byte, parsed *store.App, options InstallOptions) ([]byte, error) {
	if options.Port == 0 && options.Volume == "" {
		return data, nil
	}

	var root map[string]any
	if err := yaml.Unmarshal(data, &root); err != nil {
		return nil, fmt.Errorf("parse compose: %w", err)
	}
	services, ok := root["services"].(map[string]any)
	if !ok {
		return nil, fmt.Errorf("compose sem services")
	}
	main, ok := services[parsed.Entrypoint.Main].(map[string]any)
	if !ok {
		return nil, fmt.Errorf("serviço principal %q não encontrado", parsed.Entrypoint.Main)
	}

	if options.Port > 0 {
		if parsed.Entrypoint.PortMap == "" {
			return nil, ErrPortMapRequired
		}
		main["ports"] = []any{fmt.Sprintf("%d:%s", options.Port, parsed.Entrypoint.PortMap)}
	}

	if options.Volume != "" {
		volumes, ok := root["volumes"].(map[string]any)
		if !ok || len(volumes) == 0 {
			return nil, ErrVolumeUnsupported
		}
		for key := range volumes {
			declaration, ok := volumes[key].(map[string]any)
			if !ok {
				volumes[key] = map[string]any{"name": options.Volume}
				continue
			}
			declaration["name"] = options.Volume
		}
	}

	rendered, err := yaml.Marshal(root)
	if err != nil {
		return nil, fmt.Errorf("encode compose: %w", err)
	}
	return rendered, nil
}
