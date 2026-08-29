package docker

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

// Candidates returns the ordered list of engine targets to try, mirroring how
// docker itself resolves a context:
//
//  1. explicit configuration (GLASS_DOCKER_HOST)
//  2. the standard DOCKER_HOST environment variable
//  3. platform default sockets, probing the most common locations first
func Candidates(configured string) []string {
	if configured != "" {
		return []string{configured}
	}
	if host := strings.TrimSpace(os.Getenv("DOCKER_HOST")); host != "" {
		return []string{host}
	}
	return defaultSocketCandidates()
}

func defaultSocketCandidates() []string {
	if runtime.GOOS == "darwin" {
		return existingOrAll([]string{
			socketPath("~/.docker/run/docker.sock"),
			socketPath("/var/run/docker.sock"),
			socketPath("~/.colima/default/docker.sock"),
			socketPath("~/.orbstack/run/docker.sock"),
		})
	}
	return []string{"unix:///var/run/docker.sock"}
}

func existingOrAll(paths []string) []string {
	var existing []string
	for _, path := range paths {
		if socketExists(path) {
			existing = append(existing, path)
		}
	}
	if len(existing) > 0 {
		return existing
	}
	return paths
}

func socketExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}

func socketPath(path string) string {
	if strings.HasPrefix(path, "~/") {
		if home, err := os.UserHomeDir(); err == nil {
			return "unix://" + filepath.Join(home, path[2:])
		}
	}
	return "unix://" + path
}
