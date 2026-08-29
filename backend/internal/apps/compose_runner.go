package apps

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os/exec"
	"strings"
	"time"
)

// commandRunner shells out to the docker CLI and is the production Runner.
type commandRunner struct {
	timeout time.Duration
}

func NewCommandRunner() Runner {
	return &commandRunner{timeout: 10 * time.Minute}
}

func (runner *commandRunner) Available() bool {
	if _, err := exec.LookPath("docker"); err != nil {
		return false
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	output, err := exec.CommandContext(ctx, "docker", "compose", "version").Output()
	return err == nil && len(output) > 0
}

// Apply runs `docker compose up -d` for a project and returns the combined
// output. Start errors surface as errors.
func (runner *commandRunner) Apply(ctx context.Context, projectDir string) (string, error) {
	args := []string{
		"compose",
		"--project-directory", projectDir,
		"-f", projectDir + "/docker-compose.yaml",
		"up", "-d", "--remove-orphans", "--pull", "missing",
	}
	return runCommand(ctx, runner.timeout, args...)
}

// Status returns the normalized state of every service in the project via
// `docker compose ps --format json`, mapping the CLI json-lines contract.
func (runner *commandRunner) Status(ctx context.Context, projectDir string) ([]ServiceStatus, error) {
	args := []string{
		"compose",
		"--project-directory", projectDir,
		"-f", projectDir + "/docker-compose.yaml",
		"ps", "--format", "json",
	}
	output, err := runCommand(ctx, runner.timeout, args...)
	if err != nil {
		if isQuietpsOutput(output) && strings.Contains(err.Error(), "exit status") {
			return []ServiceStatus{}, nil
		}
		return nil, err
	}
	return parsePSJSON(output)
}

// Down stops and removes the compose project's containers. When removeVolumes
// is true it also removes the project's named volumes with `-v`.
func (runner *commandRunner) Down(ctx context.Context, projectDir string, removeVolumes bool) error {
	args := []string{
		"compose",
		"--project-directory", projectDir,
		"-f", projectDir + "/docker-compose.yaml",
		"down",
	}
	if removeVolumes {
		args = append(args, "-v")
	}
	_, err := runCommand(ctx, runner.timeout, args...)
	return err
}

// RemoveImage deletes a docker image by reference.
func (runner *commandRunner) RemoveImage(ctx context.Context, image string) error {
	_, err := runCommand(ctx, runner.timeout, "image", "rm", image)
	return err
}

// parsePSJSON parses `docker compose ps --format json`, which emits one JSON
// object per service line.
func parsePSJSON(output string) ([]ServiceStatus, error) {
	var states []ServiceStatus
	for _, line := range strings.Split(output, "\n") {
		if strings.TrimSpace(line) == "" {
			continue
		}
		var entry struct {
			Name   string `json:"Name"`
			Image  string `json:"Image"`
			State  string `json:"State"`
			Health string `json:"Health"`
		}
		if err := json.Unmarshal([]byte(line), &entry); err != nil {
			return nil, fmt.Errorf("parse compose ps: %w", err)
		}
		states = append(states, ServiceStatus{
			Name:   entry.Name,
			Image:  entry.Image,
			State:  entry.State,
			Health: entry.Health,
		})
	}
	return states, nil
}

// isQuietpsOutput reports whether an empty `ps` run produced no output, which
// the CLI signals with a non-zero exit and no stdout.
func isQuietpsOutput(output string) bool {
	return strings.TrimSpace(output) == ""
}

func runCommand(ctx context.Context, timeout time.Duration, args ...string) (string, error) {
	command := exec.CommandContext(ctx, "docker", args...)
	output, err := command.CombinedOutput()
	if ctx.Err() != nil {
		return string(output), ctx.Err()
	}
	if err != nil {
		return string(output), errors.New(strings.TrimSpace(string(output)))
	}
	return strings.TrimSpace(string(output)), nil
}
