package apps

import (
	"context"
	"errors"
	"os"
	"strings"
	"testing"

	"github.com/goccy/go-yaml"
)

const fixtureCompose = `name: uptime-kuma
services:
  uptime-kuma:
    image: louislam/uptime-kuma:1.23.16
    volumes:
      - uptime-kuma-data:/app/data
volumes:
  uptime-kuma-data:
    name: uptime-kuma-data
x-glass:
  title: Uptime Kuma
  description: Monitor de uptime com painel web.
  developer: Louis Lam
  version: 1.23.16
  icon: icon.png
  category: devops
  entrypoint:
    main: uptime-kuma
    index: /
    portMap: 3001
    scheme: http
`

func planner() *Installer {
	runner := &fakeRunner{states: []ServiceStatus{{Name: "uptime-kuma", State: "running", Health: "healthy"}}}
	return NewInstaller(
		newMemoryStore(),
		fakeManifests{compose: map[string]string{"uptime-kuma": fixtureCompose}},
		runner,
		os.TempDir(),
		nil,
		nil,
	)
}

func TestPlanPassthroughWithoutOptions(t *testing.T) {
	plan, err := planner().Plan(context.Background(), "uptime-kuma", InstallOptions{})
	if err != nil {
		t.Fatal(err)
	}
	if string(plan.Compose) != fixtureCompose {
		t.Fatalf("compose changed without options:\n%s", plan.Compose)
	}
}

func TestPlanUnknownApp(t *testing.T) {
	if _, err := planner().Plan(context.Background(), "ghost", InstallOptions{}); !errors.Is(err, ErrApplicationNotFound) {
		t.Fatalf("err = %v", err)
	}
}

func TestPlanWithPort(t *testing.T) {
	plan, err := planner().Plan(context.Background(), "uptime-kuma", InstallOptions{Port: 8080})
	if err != nil {
		t.Fatal(err)
	}
	var root map[string]any
	if err := yaml.Unmarshal(plan.Compose, &root); err != nil {
		t.Fatal(err)
	}
	main := root["services"].(map[string]any)["uptime-kuma"].(map[string]any)
	ports := main["ports"].([]any)
	if len(ports) != 1 || ports[0] != "8080:3001" {
		t.Fatalf("ports = %v", ports)
	}
}

func TestPlanWithPortRequiresPortMap(t *testing.T) {
	composeNoPortMap := strings.Replace(fixtureCompose, "    portMap: 3001\n", "", 1)
	service := NewInstaller(
		newMemoryStore(),
		fakeManifests{compose: map[string]string{"uptime-kuma": composeNoPortMap}},
		&fakeRunner{},
		os.TempDir(),
		nil,
		nil,
	)
	if _, err := service.Plan(context.Background(), "uptime-kuma", InstallOptions{Port: 8080}); !errors.Is(err, ErrPortMapRequired) {
		t.Fatalf("err = %v", err)
	}
}

func TestPlanWithVolume(t *testing.T) {
	plan, err := planner().Plan(context.Background(), "uptime-kuma", InstallOptions{Volume: "backup-disk"})
	if err != nil {
		t.Fatal(err)
	}
	var root map[string]any
	if err := yaml.Unmarshal(plan.Compose, &root); err != nil {
		t.Fatal(err)
	}
	volume := root["volumes"].(map[string]any)["uptime-kuma-data"].(map[string]any)
	if volume["name"] != "backup-disk" {
		t.Fatalf("volume = %v", volume)
	}
}

func TestPlanWithVolumeUnsupported(t *testing.T) {
	composeNoVolumes := strings.Replace(fixtureCompose, "volumes:\n  uptime-kuma-data:\n    name: uptime-kuma-data\n", "", 1)
	composeNoVolumes = strings.Replace(composeNoVolumes, "      - uptime-kuma-data:/app/data\n", "", 1)
	service := NewInstaller(
		newMemoryStore(),
		fakeManifests{compose: map[string]string{"uptime-kuma": composeNoVolumes}},
		&fakeRunner{},
		os.TempDir(),
		nil,
		nil,
	)
	if _, err := service.Plan(context.Background(), "uptime-kuma", InstallOptions{Volume: "disk"}); !errors.Is(err, ErrVolumeUnsupported) {
		t.Fatalf("err = %v", err)
	}
}

func TestParsePSJSON(t *testing.T) {
	output := `{"Name":"uptime-kuma-1","Image":"louislam/uptime-kuma:1.23.16","State":"running","Health":"healthy"}`
	states, err := parsePSJSON(output)
	if err != nil {
		t.Fatal(err)
	}
	if len(states) != 1 || states[0].Name != "uptime-kuma-1" ||
		states[0].State != "running" || states[0].Health != "healthy" {
		t.Fatalf("states = %+v", states)
	}
}

func TestServicesHealthy(t *testing.T) {
	if !servicesHealthy([]ServiceStatus{{Name: "a", State: "running", Health: "healthy"}}) {
		t.Fatal("healthy running service must be healthy")
	}
	if servicesHealthy([]ServiceStatus{{Name: "a", State: "exited"}}) {
		t.Fatal("exited service must not be healthy")
	}
	if servicesHealthy([]ServiceStatus{{Name: "a", State: "running", Health: "unhealthy"}}) {
		t.Fatal("unhealthy service must not be healthy")
	}
	if servicesHealthy(nil) {
		t.Fatal("no services must not be healthy")
	}
}
