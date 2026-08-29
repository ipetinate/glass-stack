package docker

import (
	"context"
	"os/exec"
	"time"
)

// DialTimeout is the per-candidate timeout used when connecting to an engine.
const DialTimeout = 3 * time.Second

// ComposeAvailable reports whether the host can run `docker compose`, the
// apply adapter for app plans. It is meant to be probed once at startup; the
// result only feeds the status/capability payload and UI hints.
func ComposeAvailable() bool {
	if _, err := exec.LookPath("docker"); err != nil {
		return false
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	output, err := exec.CommandContext(ctx, "docker", "compose", "version").Output()
	return err == nil && len(output) > 0
}
