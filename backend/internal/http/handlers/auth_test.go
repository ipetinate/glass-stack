package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/ipetinate/glass-stack/backend/internal/auth"
)

func TestCheckPasswordResponse(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		result      auth.PasswordCompromiseResult
		status      auth.PasswordAssessmentStatus
		occurrences uint64
	}{
		{
			name:   "safe",
			result: auth.PasswordCompromiseResult{Complete: true},
			status: auth.PasswordAssessmentSafe,
		},
		{
			name: "compromised",
			result: auth.PasswordCompromiseResult{
				Compromised: true,
				Complete:    true,
				Occurrences: 71,
			},
			status:      auth.PasswordAssessmentCompromised,
			occurrences: 71,
		},
		{
			name:   "remote unavailable",
			result: auth.PasswordCompromiseResult{Complete: false},
			status: auth.PasswordAssessmentUnavailable,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()
			service, err := auth.NewService(
				nil,
				make([]byte, 32),
				handlerPasswordChecker{result: test.result},
			)
			if err != nil {
				t.Fatal(err)
			}
			handler := NewAuthHandler(
				service,
				func(http.ResponseWriter, *http.Request, string, string) {},
				func(http.ResponseWriter, *http.Request) {},
			)
			body, _ := json.Marshal(map[string]string{
				"password": "a sufficiently long unique passphrase",
			})
			request := httptest.NewRequest(
				http.MethodPost,
				"/api/v1/auth/password/check",
				bytes.NewReader(body),
			)
			response := httptest.NewRecorder()

			handler.CheckPassword(response, request)

			if response.Code != http.StatusOK {
				t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
			}
			var output struct {
				Status      auth.PasswordAssessmentStatus `json:"status"`
				Occurrences uint64                        `json:"occurrences"`
			}
			if err := json.Unmarshal(response.Body.Bytes(), &output); err != nil {
				t.Fatal(err)
			}
			if output.Status != test.status ||
				output.Occurrences != test.occurrences {
				t.Fatalf("response = %+v", output)
			}
		})
	}
}

type handlerPasswordChecker struct {
	result auth.PasswordCompromiseResult
}

func (checker handlerPasswordChecker) Check(
	context.Context,
	auth.PasswordDigest,
) (auth.PasswordCompromiseResult, error) {
	return checker.result, nil
}
