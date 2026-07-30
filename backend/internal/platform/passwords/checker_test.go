package passwords

import (
	"context"
	"crypto/sha1"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sort"
	"strings"
	"testing"

	"github.com/ipetinate/glass-stack/backend/internal/auth"
)

func TestCheckerUsesLocalDataBeforeRemote(t *testing.T) {
	t.Parallel()

	localDigest := auth.PasswordDigest(sha1.Sum([]byte("locally blocked password")))
	remote := &fakeRangeClient{occurrences: 12}
	checker := mustChecker(t, []auth.PasswordDigest{localDigest}, remote)

	result, err := checker.Check(context.Background(), localDigest)
	if err != nil {
		t.Fatal(err)
	}
	if !result.Compromised || result.Complete || remote.calls != 0 {
		t.Fatalf("result = %+v, remote calls = %d", result, remote.calls)
	}
}

func TestEmbeddedBlocklistContainsCommonPassword(t *testing.T) {
	t.Parallel()

	checker, err := New(ModeLocal)
	if err != nil {
		t.Fatal(err)
	}
	result, err := checker.Check(
		context.Background(),
		auth.PasswordDigest(sha1.Sum([]byte("123456"))),
	)
	if err != nil {
		t.Fatal(err)
	}
	if !result.Compromised {
		t.Fatal("embedded blocklist did not contain a known common password")
	}
	if len(checker.local) != 100_000*digestBytes {
		t.Fatalf("embedded blocklist size = %d", len(checker.local))
	}
}

func TestCheckerReportsRemoteCoverageAndDegradation(t *testing.T) {
	t.Parallel()

	digest := auth.PasswordDigest(sha1.Sum([]byte("candidate passphrase")))
	tests := []struct {
		name   string
		remote rangeClient
		status auth.PasswordCompromiseResult
	}{
		{
			name:   "remote match",
			remote: &fakeRangeClient{occurrences: 42},
			status: auth.PasswordCompromiseResult{
				Compromised: true,
				Complete:    true,
				Occurrences: 42,
			},
		},
		{
			name:   "remote miss",
			remote: &fakeRangeClient{},
			status: auth.PasswordCompromiseResult{Complete: true},
		},
		{
			name:   "remote unavailable",
			remote: &fakeRangeClient{err: fmt.Errorf("offline")},
			status: auth.PasswordCompromiseResult{Complete: false},
		},
		{
			name:   "local mode",
			remote: nil,
			status: auth.PasswordCompromiseResult{Complete: false},
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()
			checker := mustChecker(
				t,
				[]auth.PasswordDigest{auth.PasswordDigest(sha1.Sum([]byte("other")))},
				test.remote,
			)
			result, err := checker.Check(context.Background(), digest)
			if err != nil {
				t.Fatal(err)
			}
			if result != test.status {
				t.Fatalf("result = %+v, want %+v", result, test.status)
			}
		})
	}
}

func TestHIBPClientUsesKAnonymityAndPadding(t *testing.T) {
	t.Parallel()

	digest := auth.PasswordDigest(sha1.Sum([]byte("candidate passphrase")))
	encoded := strings.ToUpper(fmt.Sprintf("%x", digest))
	server := httptest.NewServer(http.HandlerFunc(func(
		response http.ResponseWriter,
		request *http.Request,
	) {
		if request.URL.Path != "/range/"+encoded[:5] {
			t.Errorf("path = %q", request.URL.Path)
		}
		if request.Header.Get("Add-Padding") != "true" {
			t.Error("padding header missing")
		}
		if request.Header.Get("User-Agent") == "" {
			t.Error("user agent missing")
		}
		_, _ = fmt.Fprintf(
			response,
			"%s:17\r\n00000000000000000000000000000000000:0\r\n",
			encoded[5:],
		)
	}))
	t.Cleanup(server.Close)

	client := newHIBPClient(server.URL + "/range/")
	occurrences, err := client.Check(context.Background(), digest)
	if err != nil {
		t.Fatal(err)
	}
	if occurrences != 17 {
		t.Fatalf("occurrences = %d, want 17", occurrences)
	}
}

func TestHIBPClientRejectsMalformedOrOversizedResponses(t *testing.T) {
	t.Parallel()

	digest := auth.PasswordDigest(sha1.Sum([]byte("candidate passphrase")))
	tests := []struct {
		name string
		body string
	}{
		{name: "malformed", body: "not-a-range-entry\n"},
		{name: "oversized", body: strings.Repeat("0", maxRangeBytes+1)},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()
			server := httptest.NewServer(http.HandlerFunc(func(
				response http.ResponseWriter,
				_ *http.Request,
			) {
				_, _ = response.Write([]byte(test.body))
			}))
			t.Cleanup(server.Close)

			client := newHIBPClient(server.URL + "/")
			if _, err := client.Check(context.Background(), digest); err == nil {
				t.Fatal("expected response validation error")
			}
		})
	}
}

type fakeRangeClient struct {
	calls       int
	occurrences uint64
	err         error
}

func (client *fakeRangeClient) Check(
	context.Context,
	auth.PasswordDigest,
) (uint64, error) {
	client.calls++
	return client.occurrences, client.err
}

func mustChecker(
	t *testing.T,
	digests []auth.PasswordDigest,
	remote rangeClient,
) *Checker {
	t.Helper()
	sort.Slice(digests, func(first, second int) bool {
		return strings.Compare(
			string(digests[first][:]),
			string(digests[second][:]),
		) < 0
	})
	data := make([]byte, 0, len(digests)*digestBytes)
	for _, digest := range digests {
		data = append(data, digest[:]...)
	}
	checker, err := newChecker(data, remote)
	if err != nil {
		t.Fatal(err)
	}
	return checker
}
