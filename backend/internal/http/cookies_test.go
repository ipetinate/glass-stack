package httpserver

import (
	"crypto/tls"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSetAuthCookiesSecurityAttributes(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		remoteAddr string
		tls        bool
		forwarded  string
		secure     bool
	}{
		{
			name:       "plain remote request",
			remoteAddr: "192.0.2.10:4000",
		},
		{
			name:       "direct TLS request",
			remoteAddr: "192.0.2.10:4000",
			tls:        true,
			secure:     true,
		},
		{
			name:       "loopback reverse proxy",
			remoteAddr: "127.0.0.1:4000",
			forwarded:  "https",
			secure:     true,
		},
		{
			name:       "untrusted forwarded protocol",
			remoteAddr: "192.0.2.10:4000",
			forwarded:  "https",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()

			request := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", nil)
			request.RemoteAddr = test.remoteAddr
			request.Header.Set("X-Forwarded-Proto", test.forwarded)
			if test.tls {
				request.TLS = &tls.ConnectionState{}
			}
			response := httptest.NewRecorder()

			setAuthCookies(response, request, "session-token", "csrf-token")

			cookies := response.Result().Cookies()
			if len(cookies) != 2 {
				t.Fatalf("cookie count = %d, want 2", len(cookies))
			}
			byName := map[string]*http.Cookie{}
			for _, cookie := range cookies {
				byName[cookie.Name] = cookie
			}
			session := byName[SessionCookieName]
			csrf := byName[CSRFCookieName]
			if session == nil || csrf == nil {
				t.Fatalf("cookies = %+v", cookies)
			}
			if session.Value != "session-token" || csrf.Value != "csrf-token" {
				t.Fatalf("unexpected cookie values: session=%q csrf=%q", session.Value, csrf.Value)
			}
			if !session.HttpOnly || csrf.HttpOnly {
				t.Fatalf("unexpected HttpOnly flags: session=%t csrf=%t", session.HttpOnly, csrf.HttpOnly)
			}
			for _, cookie := range cookies {
				if cookie.Path != "/" || cookie.MaxAge <= 0 {
					t.Fatalf("invalid cookie lifetime: %+v", cookie)
				}
				if cookie.SameSite != http.SameSiteLaxMode {
					t.Fatalf("SameSite = %v, want Lax", cookie.SameSite)
				}
				if cookie.Secure != test.secure {
					t.Fatalf("Secure = %t, want %t", cookie.Secure, test.secure)
				}
			}
		})
	}
}
