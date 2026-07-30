package auth

import (
	"bytes"
	"context"
	"errors"
	"log/slog"
	"strings"
	"testing"
	"time"

	"github.com/ipetinate/glass-stack/backend/internal/observability"
)

func TestRecordAuditLogsPersistenceFailure(t *testing.T) {
	t.Parallel()

	var output bytes.Buffer
	service := &Service{
		store:  failingAuditStore{err: errors.New("database unavailable")},
		logger: slog.New(slog.NewJSONHandler(&output, nil)),
		now:    time.Now,
	}
	ctx := observability.WithRequestID(context.Background(), "request-123")

	service.recordAudit(
		ctx,
		"actor-1",
		"identity.test",
		"target-1",
		"success",
		nil,
	)

	logged := output.String()
	for _, expected := range []string{
		"failed to persist authentication audit event",
		`"request_id":"request-123"`,
		`"action":"identity.test"`,
		"database unavailable",
	} {
		if !strings.Contains(logged, expected) {
			t.Fatalf("log %q does not contain %q", logged, expected)
		}
	}
}

type failingAuditStore struct {
	Store
	err error
}

func (store failingAuditStore) AppendAudit(context.Context, AuditEvent) error {
	return store.err
}
