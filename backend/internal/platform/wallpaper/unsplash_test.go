package wallpaper

import (
	"context"
	"io"
	"net/http"
	"strings"
	"testing"
)

func TestUnsplashSearchBuildsRestrictedProviderRequest(t *testing.T) {
	t.Parallel()

	var received *http.Request
	provider := &Unsplash{
		accessKey: "test-key",
		apiClient: &http.Client{
			Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
				received = request.Clone(request.Context())
				return jsonResponse(http.StatusOK, `{
					"results":[{
						"id":"photo-1",
						"urls":{"raw":"https://images.unsplash.com/photo-1?ixid=abc"},
						"links":{"html":"https://unsplash.com/photos/photo-1"},
						"user":{"links":{"html":"https://unsplash.com/@ada"}}
					}],
					"total_pages":1
				}`), nil
			}),
		},
	}

	result, err := provider.Search(context.Background(), "misty mountains", 2)
	if err != nil {
		t.Fatal(err)
	}
	if received == nil {
		t.Fatal("provider request was not sent")
	}
	if received.URL.Hostname() != "api.unsplash.com" ||
		received.URL.Query().Get("query") != "misty mountains" ||
		received.URL.Query().Get("page") != "2" ||
		received.Header.Get("Authorization") != "Client-ID test-key" {
		t.Fatalf("unexpected request: %+v", received)
	}
	if len(result.Results) != 1 ||
		!strings.Contains(result.Results[0].URLs.Raw, "w=3840") ||
		!strings.Contains(result.Results[0].User.Links.HTML, "utm_source=glass_stack") {
		t.Fatalf("unexpected normalized result: %+v", result)
	}
}

func TestUnsplashRejectsUntrustedEndpoints(t *testing.T) {
	t.Parallel()

	provider := &Unsplash{
		accessKey: "test-key",
		apiClient: &http.Client{
			Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
				t.Fatal("untrusted endpoint reached the HTTP transport")
				return nil, nil
			}),
		},
	}

	if err := provider.getJSON(
		context.Background(),
		"https://attacker.example/photos",
		&map[string]any{},
	); err == nil {
		t.Fatal("expected an untrusted API endpoint to be rejected")
	}
	if _, _, _, err := provider.Download(
		context.Background(),
		"https://attacker.example/wallpaper.jpg",
	); err == nil {
		t.Fatal("expected an untrusted image endpoint to be rejected")
	}
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (function roundTripFunc) RoundTrip(
	request *http.Request,
) (*http.Response, error) {
	return function(request)
}

func jsonResponse(status int, body string) *http.Response {
	return &http.Response{
		StatusCode: status,
		Header: http.Header{
			"Content-Type": []string{"application/json"},
		},
		Body: io.NopCloser(strings.NewReader(body)),
	}
}
