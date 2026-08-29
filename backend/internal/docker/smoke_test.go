//go:build integration

package docker_test

import (
	"context"
	"testing"
	"time"

	"github.com/ipetinate/glass-stack/backend/internal/docker"
)

const smokeProbeTimeout = 2 * time.Second

func TestSmokeDockerEngine(t *testing.T) {
	candidates := docker.Candidates("")
	engine, err := docker.Dial(candidates, docker.DialTimeout)
	if err != nil {
		t.Skipf("docker engine unreachable, skipping smoke: %v", err)
	}

	probe, cancel := context.WithTimeout(context.Background(), smokeProbeTimeout)
	defer cancel()
	if err := engine.Ping(probe); err != nil {
		t.Skipf("docker engine ping failed, skipping smoke: %v", err)
	}

	t.Run("info", func(t *testing.T) {
		ctx, cancel := context.WithTimeout(context.Background(), smokeProbeTimeout)
		defer cancel()
		info, err := engine.Info(ctx)
		if err != nil {
			t.Fatalf("info failed: %v", err)
		}
		if info.ServerVersion == "" {
			t.Fatal("info returned empty server version")
		}
	})

	t.Run("inventory", func(t *testing.T) {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		containers, err := engine.ListContainers(ctx)
		if err != nil {
			t.Fatalf("list containers failed: %v", err)
		}
		if len(containers) == 0 {
			t.Skip("daemon has no containers")
		}
		if _, err := engine.InspectContainer(ctx, containers[0].ID); err != nil {
			t.Fatalf("inspect container failed: %v", err)
		}
	})

	t.Run("logs", func(t *testing.T) {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		containers, err := engine.ListContainers(ctx)
		if err != nil {
			t.Fatalf("list containers failed: %v", err)
		}
		if len(containers) == 0 {
			t.Skip("daemon has no containers")
		}
		if _, err := engine.ContainerLogs(ctx, containers[0].ID, docker.LogQuery{Tail: 10}); err != nil {
			t.Fatalf("container logs failed: %v", err)
		}
	})

	t.Run("stats", func(t *testing.T) {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		containers, err := engine.ListContainers(ctx)
		if err != nil {
			t.Fatalf("list containers failed: %v", err)
		}
		if len(containers) == 0 {
			t.Skip("daemon has no containers")
		}
		if _, err := engine.ContainerStats(ctx, containers[0].ID); err != nil {
			t.Fatalf("container stats failed: %v", err)
		}
	})

	t.Run("events", func(t *testing.T) {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		events := 0
		err := engine.EngineEvents(ctx, func(docker.EventMessage) error {
			events++
			return nil
		})
		if err != nil && err != context.Canceled {
			t.Fatalf("events failed: %v", err)
		}
		if events < 0 {
			t.Fatalf("negative event count: %d", events)
		}
	})
}
