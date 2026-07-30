package httpserver

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"net/http"
	"sync/atomic"
	"time"

	"github.com/ipetinate/glass-stack/backend/internal/observability"
)

const RequestIDHeader = "X-Request-ID"

var requestIDFallbackCounter atomic.Uint64

func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		requestID := newRequestID()
		request.Header.Set(RequestIDHeader, requestID)
		response.Header().Set(RequestIDHeader, requestID)
		ctx := observability.WithRequestID(request.Context(), requestID)
		next.ServeHTTP(response, request.WithContext(ctx))
	})
}

func newRequestID() string {
	value := make([]byte, 16)
	if _, err := rand.Read(value); err == nil {
		return base64.RawURLEncoding.EncodeToString(value)
	}
	return fmt.Sprintf(
		"%x-%x",
		time.Now().UTC().UnixNano(),
		requestIDFallbackCounter.Add(1),
	)
}
