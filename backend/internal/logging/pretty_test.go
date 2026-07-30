package logging

import (
	"bytes"
	"log/slog"
	"strings"
	"testing"
)

func TestPrettyHandlerPrintsReadableBlocks(t *testing.T) {
	var output bytes.Buffer
	logger := slog.New(newPrettyHandler(&output, &slog.HandlerOptions{})).With(
		"service", "glassd",
		"environment", Development,
	)

	logger.Info("http request", "method", "GET", "path", "/api/health", "status", 200)

	value := output.String()
	for _, expected := range []string{
		"ℹ️ INFO http request",
		"\n  service: glassd",
		"\n  environment: development",
		"\n  method: GET",
		"\n  path: /api/health",
		"\n  status: 200",
		"\n\n",
	} {
		if !strings.Contains(value, expected) {
			t.Fatalf("pretty log %q does not contain %q", value, expected)
		}
	}
}
