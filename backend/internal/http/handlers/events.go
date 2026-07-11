package handlers

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"time"
)

type TemperaturePayload struct {
	CPU int `json:"cpu"`
	GPU int `json:"gpu"`
}

type Event struct {
	Type    string             `json:"type"`
	Payload TemperaturePayload `json:"payload"`
}

func Events(response http.ResponseWriter, request *http.Request) {
	flusher, ok := response.(http.Flusher)

	if !ok {
		http.Error(response, "streaming unsuported", http.StatusInternalServerError)
	}

	response.Header().Set("Content-Type", "text/event-stream")
	response.Header().Set("Cache-Control", "no-cache")
	response.Header().Set("Connection", "keep-alive")

	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-request.Context().Done():
			return
		case <-ticker.C:
			event := Event{
				Type: "temperature",
				Payload: TemperaturePayload{
					CPU: rand.Intn(41) + 40,
					GPU: rand.Intn(41) + 40,
				},
			}
			data, err := json.Marshal(event)

			if err != nil {
				return
			}

			fmt.Fprintf(response, "data: %s\n\n", data)
			flusher.Flush()
		}
	}
}
