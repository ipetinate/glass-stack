package apps

import (
	"context"
	"errors"
	"strings"
	"testing"
)

func accessURLFixture(t *testing.T, instances map[string]InstallOptions) *Installer {
	t.Helper()
	store := newMemoryStore()
	for appID, options := range instances {
		seedInstalled(store, appID, options, "1.0.0")
	}
	return NewInstaller(
		store,
		fakeManifests{compose: map[string]string{"uptime-kuma": fixtureCompose}},
		nil,
		"",
		nil,
		nil,
	)
}

func TestAccessURLResolverWinsOverOptions(t *testing.T) {
	service := accessURLFixture(t, map[string]InstallOptions{"uptime-kuma": {Port: 8080}})
	service.SetPortResolver(func(_ context.Context, _ string) (int, bool, error) {
		return 9090, true, nil
	})
	url, err := service.AccessURL(context.Background(), "uptime-kuma")
	if err != nil {
		t.Fatal(err)
	}
	if url != "http://localhost:9090/" {
		t.Fatalf("url = %q", url)
	}
}

func TestAccessURLOptionsWinOverPortMap(t *testing.T) {
	service := accessURLFixture(t, map[string]InstallOptions{"uptime-kuma": {Port: 8080}})
	url, err := service.AccessURL(context.Background(), "uptime-kuma")
	if err != nil {
		t.Fatal(err)
	}
	if url != "http://localhost:8080/" {
		t.Fatalf("url = %q", url)
	}
}

func TestAccessURLFallsBackToPortMap(t *testing.T) {
	service := accessURLFixture(t, map[string]InstallOptions{"uptime-kuma": {}})
	url, err := service.AccessURL(context.Background(), "uptime-kuma")
	if err != nil {
		t.Fatal(err)
	}
	if url != "http://localhost:3001/" {
		t.Fatalf("url = %q", url)
	}
}

func TestAccessURLNoPortReturnsEmpty(t *testing.T) {
	service := NewInstaller(
		newMemoryStore(),
		fakeManifests{compose: map[string]string{"uptime-kuma": strings.Replace(fixtureCompose, "    portMap: 3001\n", "", 1)}},
		nil,
		"",
		nil,
		nil,
	)
	seedInstalled(service.store, "uptime-kuma", InstallOptions{}, "1.0.0")
	url, err := service.AccessURL(context.Background(), "uptime-kuma")
	if err != nil {
		t.Fatal(err)
	}
	if url != "" {
		t.Fatalf("url = %q", url)
	}
}

func TestAccessURLHostResolver(t *testing.T) {
	service := accessURLFixture(t, map[string]InstallOptions{"uptime-kuma": {}})
	service.SetHostResolver(func() string { return "glass.local" })
	url, err := service.AccessURL(context.Background(), "uptime-kuma")
	if err != nil {
		t.Fatal(err)
	}
	if url != "http://glass.local:3001/" {
		t.Fatalf("url = %q", url)
	}
}

func TestAccessURLSchemeAndIndex(t *testing.T) {
	secureCompose := strings.Replace(fixtureCompose, "    scheme: http", "    scheme: https", 1)
	secureCompose = strings.Replace(secureCompose, "    index: /", "    index: /monitor", 1)
	service := NewInstaller(
		newMemoryStore(),
		fakeManifests{compose: map[string]string{"uptime-kuma": secureCompose}},
		nil,
		"",
		nil,
		nil,
	)
	seedInstalled(service.store, "uptime-kuma", InstallOptions{Port: 8443}, "1.0.0")
	url, err := service.AccessURL(context.Background(), "uptime-kuma")
	if err != nil {
		t.Fatal(err)
	}
	if url != "https://localhost:8443/monitor" {
		t.Fatalf("url = %q", url)
	}
}

func TestAccessURLResolverError(t *testing.T) {
	service := accessURLFixture(t, map[string]InstallOptions{"uptime-kuma": {}})
	wantErr := errors.New("porta host desconhecida")
	service.SetPortResolver(func(_ context.Context, _ string) (int, bool, error) {
		return 0, false, wantErr
	})
	if _, err := service.AccessURL(context.Background(), "uptime-kuma"); !errors.Is(err, wantErr) {
		t.Fatalf("err = %v", err)
	}
}

func TestAccessURLNotInstalled(t *testing.T) {
	service := accessURLFixture(t, map[string]InstallOptions{})
	if _, err := service.AccessURL(context.Background(), "ghost"); !errors.Is(err, ErrNotInstalled) {
		t.Fatalf("err = %v", err)
	}
}

func TestAccessURLManifestNotFound(t *testing.T) {
	service := accessURLFixture(t, map[string]InstallOptions{"ghost": {}})
	if _, err := service.AccessURL(context.Background(), "ghost"); !errors.Is(err, ErrApplicationNotFound) {
		t.Fatalf("err = %v", err)
	}
}

func TestBuildAccessURL(t *testing.T) {
	for _, row := range []struct {
		scheme string
		host   string
		port   int
		index  string
		want   string
	}{
		{"http", "localhost", 8080, "/", "http://localhost:8080/"},
		{"https", "glass.local", 443, "/status", "https://glass.local:443/status"},
		{"http", "10.0.0.2", 3001, "/", "http://10.0.0.2:3001/"},
	} {
		if got := buildAccessURL(row.scheme, row.host, row.port, row.index); got != row.want {
			t.Fatalf("buildAccessURL(%q, %q, %d, %q) = %q", row.scheme, row.host, row.port, row.index, got)
		}
	}
}
