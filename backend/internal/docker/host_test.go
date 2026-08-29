package docker_test

import (
	"os"
	"strings"
	"testing"

	"github.com/ipetinate/glass-stack/backend/internal/docker"
)

func TestCandidatesConfiguredWins(t *testing.T) {
	candidates := docker.Candidates("tcp://127.0.0.1:2375")
	if len(candidates) != 1 || candidates[0] != "tcp://127.0.0.1:2375" {
		t.Fatalf("candidates = %v", candidates)
	}
}

func TestCandidatesFallsBackToDockerHostEnv(t *testing.T) {
	t.Setenv("DOCKER_HOST", "tcp://127.0.0.1:2376")

	candidates := docker.Candidates("")
	if len(candidates) != 1 || candidates[0] != "tcp://127.0.0.1:2376" {
		t.Fatalf("candidates = %v", candidates)
	}
}

func TestCandidatesConfiguredOverridesEnv(t *testing.T) {
	t.Setenv("DOCKER_HOST", "tcp://127.0.0.1:2376")

	candidates := docker.Candidates("unix:///var/run/docker.sock")
	if len(candidates) != 1 || candidates[0] != "unix:///var/run/docker.sock" {
		t.Fatalf("candidates = %v", candidates)
	}
}

func TestCandidatesDefaultAreUnixSocketsWhenEnvUnset(t *testing.T) {
	os.Unsetenv("DOCKER_HOST")

	candidates := docker.Candidates("")
	if len(candidates) == 0 {
		t.Fatal("expected platform default candidates")
	}
	for _, candidate := range candidates {
		if !strings.HasPrefix(candidate, "unix://") {
			t.Fatalf("candidate %q is not a unix socket", candidate)
		}
	}
}
