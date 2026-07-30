package httpserver

import (
	"net"
	"net/http"
	"strconv"
	"sync"
	"time"
)

type rateLimitEntry struct {
	windowStart time.Time
	count       int
}

type rateLimiter struct {
	mu      sync.Mutex
	entries map[string]rateLimitEntry
	limit   int
	window  time.Duration
	now     func() time.Time
}

func RateLimit(limit int, window time.Duration) func(http.Handler) http.Handler {
	limiter := &rateLimiter{
		entries: make(map[string]rateLimitEntry),
		limit:   limit,
		window:  window,
		now:     time.Now,
	}
	return limiter.middleware
}

func (limiter *rateLimiter) middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		now := limiter.now()
		key := requestIP(request)
		allowed, retryAfter := limiter.allow(key, now)
		if !allowed {
			response.Header().Set("Retry-After", strconv.Itoa(max(1, int(retryAfter.Seconds()))))
			writeHTTPError(response, request, http.StatusTooManyRequests, "rate_limited", "Too many attempts. Try again later.")
			return
		}
		next.ServeHTTP(response, request)
	})
}

func (limiter *rateLimiter) allow(key string, now time.Time) (bool, time.Duration) {
	limiter.mu.Lock()
	defer limiter.mu.Unlock()

	entry := limiter.entries[key]
	if entry.windowStart.IsZero() || now.Sub(entry.windowStart) >= limiter.window {
		limiter.entries[key] = rateLimitEntry{windowStart: now, count: 1}
		return true, 0
	}
	if entry.count >= limiter.limit {
		return false, limiter.window - now.Sub(entry.windowStart)
	}
	entry.count++
	limiter.entries[key] = entry

	if len(limiter.entries) > 4096 {
		for candidate, value := range limiter.entries {
			if now.Sub(value.windowStart) >= limiter.window {
				delete(limiter.entries, candidate)
			}
		}
	}
	return true, 0
}

func requestIP(request *http.Request) string {
	host, _, err := net.SplitHostPort(request.RemoteAddr)
	if err == nil {
		return host
	}
	return request.RemoteAddr
}
