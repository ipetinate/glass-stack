package httpserver

import (
	"context"
	"net/http"
	"net/url"
	"strings"

	"github.com/ipetinate/glass-stack/backend/internal/auth"
)

type authContextKey struct{}

func RequireAuthentication(service *auth.Service) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
			cookie, err := request.Cookie(SessionCookieName)
			if err != nil {
				writeHTTPError(response, request, http.StatusUnauthorized, "authentication_required", "Authentication is required.")
				return
			}
			sessionUser, err := service.Authenticate(request.Context(), cookie.Value)
			if err != nil {
				clearAuthCookies(response, request)
				writeHTTPError(response, request, http.StatusUnauthorized, "authentication_required", "Authentication is required.")
				return
			}
			context := context.WithValue(request.Context(), authContextKey{}, sessionUser)
			next.ServeHTTP(response, request.WithContext(context))
		})
	}
}

func RequireCSRF(
	service *auth.Service,
	allowedOrigins ...string,
) func(http.Handler) http.Handler {
	origins := make(map[string]struct{}, len(allowedOrigins))
	for _, origin := range allowedOrigins {
		origins[strings.TrimSuffix(origin, "/")] = struct{}{}
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
			if request.Method == http.MethodGet ||
				request.Method == http.MethodHead ||
				request.Method == http.MethodOptions {
				next.ServeHTTP(response, request)
				return
			}
			if !validRequestOrigin(request, origins) {
				writeHTTPError(response, request, http.StatusForbidden, "origin_rejected", "The request origin is not allowed.")
				return
			}
			sessionUser, ok := AuthenticatedSession(request.Context())
			if !ok || !service.ValidateCSRF(
				sessionUser.Session,
				request.Header.Get("X-CSRF-Token"),
			) {
				writeHTTPError(response, request, http.StatusForbidden, "csrf_rejected", "The request could not be verified.")
				return
			}
			next.ServeHTTP(response, request)
		})
	}
}

func validRequestOrigin(request *http.Request, allowed map[string]struct{}) bool {
	origin := strings.TrimSuffix(request.Header.Get("Origin"), "/")
	if origin == "" {
		return true
	}
	parsed, err := url.Parse(origin)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" || parsed.User != nil {
		return false
	}
	if strings.EqualFold(parsed.Host, request.Host) {
		return true
	}
	_, ok := allowed[origin]
	return ok
}

func RequireRole(roles ...auth.Role) func(http.Handler) http.Handler {
	allowed := make(map[auth.Role]struct{}, len(roles))
	for _, role := range roles {
		allowed[role] = struct{}{}
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
			sessionUser, ok := AuthenticatedSession(request.Context())
			if !ok {
				writeHTTPError(response, request, http.StatusUnauthorized, "authentication_required", "Authentication is required.")
				return
			}
			if _, ok := allowed[sessionUser.User.Role]; !ok {
				writeHTTPError(response, request, http.StatusForbidden, "permission_denied", "You do not have permission to perform this action.")
				return
			}
			next.ServeHTTP(response, request)
		})
	}
}

func AuthenticatedSession(ctx context.Context) (auth.SessionUser, bool) {
	session, ok := ctx.Value(authContextKey{}).(auth.SessionUser)
	return session, ok
}
