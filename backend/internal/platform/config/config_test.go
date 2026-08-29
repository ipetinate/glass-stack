package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestPasswordCompromiseMode(t *testing.T) {
	tests := []struct {
		name       string
		configured string
		expected   string
		wantError  bool
	}{
		{name: "default", expected: "hybrid"},
		{name: "hybrid", configured: "HYBRID", expected: "hybrid"},
		{name: "local", configured: "local", expected: "local"},
		{name: "invalid", configured: "disabled", wantError: true},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Setenv("GLASS_ENV", "development")
			t.Setenv("GLASS_DATA_DIR", filepath.Join(t.TempDir(), "data"))
			t.Setenv("GLASS_PASSWORD_COMPROMISE_MODE", test.configured)

			configuration, err := Load()
			if test.wantError {
				if err == nil {
					t.Fatal("expected invalid password compromise mode to fail")
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if configuration.PasswordCompromiseMode != test.expected {
				t.Fatalf(
					"mode = %q, want %q",
					configuration.PasswordCompromiseMode,
					test.expected,
				)
			}
		})
	}
}

func TestReadEnvironmentFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), ".env")
	if err := os.WriteFile(
		path,
		[]byte(
			"# local development\n"+
				"GLASS_UNSPLASH_ACCESS_KEY='local-key'\n"+
				"export GLASS_UNSPLASH_SELF_HOST=true\n",
		),
		0o600,
	); err != nil {
		t.Fatal(err)
	}

	values, err := readEnvironmentFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if values["GLASS_UNSPLASH_ACCESS_KEY"] != "local-key" {
		t.Fatal("expected the access key to be read without quotes")
	}
	if values["GLASS_UNSPLASH_SELF_HOST"] != "true" {
		t.Fatal("expected export-prefixed values to be supported")
	}
}

func TestDockerHost(t *testing.T) {
	tests := []struct {
		name       string
		configured string
		expected   string
	}{
		{name: "defaults to empty", expected: ""},
		{name: "unix socket", configured: "unix:///var/run/docker.sock", expected: "unix:///var/run/docker.sock"},
		{name: "tcp target", configured: "tcp://127.0.0.1:2375", expected: "tcp://127.0.0.1:2375"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Setenv("GLASS_ENV", "development")
			t.Setenv("GLASS_DATA_DIR", filepath.Join(t.TempDir(), "data"))
			t.Setenv("GLASS_DOCKER_HOST", test.configured)

			configuration, err := Load()
			if err != nil {
				t.Fatal(err)
			}
			if configuration.DockerHost != test.expected {
				t.Fatalf("DockerHost = %q, want %q", configuration.DockerHost, test.expected)
			}
		})
	}
}

func TestConfiguredValuePrefersProcessEnvironment(t *testing.T) {
	t.Setenv("GLASS_UNSPLASH_ACCESS_KEY", "shell-key")

	value := configuredValue(
		map[string]string{"GLASS_UNSPLASH_ACCESS_KEY": "file-key"},
		"GLASS_UNSPLASH_ACCESS_KEY",
		"",
	)
	if value != "shell-key" {
		t.Fatalf("value = %q, want shell-key", value)
	}
}
