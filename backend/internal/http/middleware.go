package httpserver

import (
	"bufio"
	"log/slog"
	"net"
	"net/http"
	"strings"
	"time"
)

func RequestLogger(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
			startedAt := time.Now()
			writer := &responseWriter{ResponseWriter: response, status: http.StatusOK}
			next.ServeHTTP(writer, request)

			logger.Info("http request",
				"method", request.Method,
				"path", request.URL.Path,
				"status", writer.status,
				"duration", time.Since(startedAt).String(),
			)
		})
	}
}

type responseWriter struct {
	http.ResponseWriter
	status      int
	wroteHeader bool
}

func (writer *responseWriter) WriteHeader(status int) {
	if writer.wroteHeader {
		return
	}
	writer.status = status
	writer.wroteHeader = true
	writer.ResponseWriter.WriteHeader(status)
}

func (writer *responseWriter) Write(data []byte) (int, error) {
	if !writer.wroteHeader {
		writer.WriteHeader(http.StatusOK)
	}
	return writer.ResponseWriter.Write(data)
}

func (writer *responseWriter) Flush() {
	if !writer.wroteHeader {
		writer.WriteHeader(http.StatusOK)
	}
	if flusher, ok := writer.ResponseWriter.(http.Flusher); ok {
		flusher.Flush()
	}
}

func (writer *responseWriter) Unwrap() http.ResponseWriter {
	return writer.ResponseWriter
}

func (writer *responseWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	hijacker, ok := writer.ResponseWriter.(http.Hijacker)
	if !ok {
		return nil, nil, http.ErrNotSupported
	}
	return hijacker.Hijack()
}

func (writer *responseWriter) Push(target string, options *http.PushOptions) error {
	pusher, ok := writer.ResponseWriter.(http.Pusher)
	if !ok {
		return http.ErrNotSupported
	}
	return pusher.Push(target, options)
}

func CORS(allowedOrigins ...string) func(http.Handler) http.Handler {
	origins := make(map[string]struct{}, len(allowedOrigins))

	for _, origin := range allowedOrigins {
		origins[origin] = struct{}{}
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
			origin := request.Header.Get("Origin")
			_, allowed := origins[origin]

			if origin == "" || !allowed {
				next.ServeHTTP(response, request)
				return
			}

			response.Header().Add("Vary", "Origin")
			response.Header().Set("Access-Control-Allow-Origin", origin)
			response.Header().Set("Access-Control-Allow-Credentials", "true")

			if request.Method == http.MethodOptions &&
				request.Header.Get("Access-Control-Request-Method") != "" {
				response.Header().Add("Vary", "Access-Control-Request-Method")
				response.Header().Add("Vary", "Access-Control-Request-Headers")
				response.Header().Set(
					"Access-Control-Allow-Methods",
					strings.Join(
						[]string{
							http.MethodGet,
							http.MethodPost,
							http.MethodPut,
							http.MethodPatch,
							http.MethodDelete,
							http.MethodOptions,
						},
						", ",
					),
				)
				response.Header().Set(
					"Access-Control-Allow-Headers",
					"Accept, Authorization, Content-Type, X-CSRF-Token",
				)
				response.Header().Set("Access-Control-Max-Age", "300")
				response.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(response, request)
		})
	}
}
