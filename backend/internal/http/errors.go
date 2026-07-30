package httpserver

import (
	"encoding/json"
	"net/http"
)

type errorEnvelope struct {
	Code      string `json:"code"`
	Message   string `json:"message"`
	RequestID string `json:"requestId,omitempty"`
}

func writeHTTPError(
	response http.ResponseWriter,
	request *http.Request,
	status int,
	code string,
	message string,
) {
	response.Header().Set("Content-Type", "application/json")
	response.WriteHeader(status)
	_ = json.NewEncoder(response).Encode(errorEnvelope{
		Code:      code,
		Message:   message,
		RequestID: request.Header.Get("X-Request-ID"),
	})
}
