package events

import "time"

// Event is the transport-neutral envelope shared by domain event publishers
// and protocol adapters.
type Event struct {
	Type       string    `json:"type"`
	OccurredAt time.Time `json:"occurredAt"`
	Payload    any       `json:"payload"`
}
