package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/ipetinate/glass-stack/backend/internal/observability"
	systeminfo "github.com/ipetinate/glass-stack/backend/internal/system"
)

func TestStorageErrorUsesPublicEnvelope(t *testing.T) {
	t.Parallel()

	request := httptest.NewRequest(http.MethodGet, "/api/v1/storage", nil)
	request = request.WithContext(
		observability.WithRequestID(request.Context(), "request-123"),
	)
	response := httptest.NewRecorder()

	Storage(storageReaderStub{
		err: errors.New("sensitive mount path /private/volume failed"),
	}).ServeHTTP(response, request)

	if response.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
	if strings.Contains(response.Body.String(), "/private/volume") {
		t.Fatalf("response leaked internal error: %s", response.Body.String())
	}
	var envelope struct {
		Code      string `json:"code"`
		RequestID string `json:"requestId"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &envelope); err != nil {
		t.Fatal(err)
	}
	if envelope.Code != "storage_unavailable" ||
		envelope.RequestID != "request-123" {
		t.Fatalf("envelope = %+v", envelope)
	}
}

type storageReaderStub struct {
	snapshot systeminfo.StorageSnapshot
	err      error
}

func (reader storageReaderStub) Read(
	context.Context,
) (systeminfo.StorageSnapshot, error) {
	return reader.snapshot, reader.err
}
