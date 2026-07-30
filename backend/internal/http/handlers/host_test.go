package handlers_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/ipetinate/glass-stack/backend/internal/http/handlers"
	systeminfo "github.com/ipetinate/glass-stack/backend/internal/system"
)

func TestHost(t *testing.T) {
	server := httptest.NewServer(handlers.Host(hostReaderStub{
		snapshot: systeminfo.HostSnapshot{
			Hostname: "glass-host",
			OS:       "darwin",
			CPU: systeminfo.HostCPU{
				Model:         "Apple M5",
				PhysicalCores: 10,
				LogicalCores:  10,
			},
			Memory: systeminfo.HostMemory{TotalBytes: 16 * 1024 * 1024 * 1024},
		},
	}))
	defer server.Close()

	response, err := server.Client().Get(server.URL)
	if err != nil {
		t.Fatalf("failed to request host: %v", err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", response.StatusCode)
	}
	if contentType := response.Header.Get("Content-Type"); contentType != "application/json" {
		t.Fatalf("expected JSON content type, got %q", contentType)
	}

	var snapshot systeminfo.HostSnapshot
	if err := json.NewDecoder(response.Body).Decode(&snapshot); err != nil {
		t.Fatalf("failed to decode host snapshot: %v", err)
	}
	if snapshot.CPU.Model != "Apple M5" || snapshot.Memory.TotalBytes == 0 {
		t.Fatalf("unexpected host snapshot: %#v", snapshot)
	}
}

type hostReaderStub struct {
	snapshot systeminfo.HostSnapshot
}

func (stub hostReaderStub) Read(context.Context) (systeminfo.HostSnapshot, error) {
	return stub.snapshot, nil
}
