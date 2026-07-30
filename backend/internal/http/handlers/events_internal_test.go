package handlers

import (
	"testing"
	"time"

	systeminfo "github.com/ipetinate/glass-stack/backend/internal/system"
)

func TestEventIntervalIsBounded(t *testing.T) {
	for _, test := range []struct {
		name     string
		input    string
		expected time.Duration
	}{
		{name: "default", input: "", expected: time.Second},
		{name: "minimum", input: "1", expected: time.Second},
		{name: "maximum", input: "5", expected: 5 * time.Second},
		{name: "below minimum", input: "0", expected: time.Second},
		{name: "above maximum", input: "6", expected: time.Second},
		{name: "invalid", input: "fast", expected: time.Second},
	} {
		t.Run(test.name, func(t *testing.T) {
			if actual := eventInterval(test.input); actual != test.expected {
				t.Fatalf("expected %s, got %s", test.expected, actual)
			}
		})
	}
}

func TestIOPayloadCalculatesRatesFromCumulativeCounters(t *testing.T) {
	previous := systeminfo.IOSnapshot{
		Disk: &systeminfo.DiskIOCounters{
			ReadBytes:  1_000,
			WriteBytes: 2_000,
		},
		Network: &systeminfo.NetworkIOCounters{
			ReceivedBytes: 3_000,
			SentBytes:     4_000,
		},
	}
	current := systeminfo.IOSnapshot{
		Disk: &systeminfo.DiskIOCounters{
			ReadBytes:  2_000,
			WriteBytes: 2_500,
		},
		Network: &systeminfo.NetworkIOCounters{
			ReceivedBytes: 5_000,
			SentBytes:     4_500,
		},
	}

	payload := ioPayload(previous, current, 500*time.Millisecond)

	assertRate(t, payload.Disk.ReadBytesPerSecond, 2_000)
	assertRate(t, payload.Disk.WriteBytesPerSecond, 1_000)
	assertRate(t, payload.Network.ReadBytesPerSecond, 4_000)
	assertRate(t, payload.Network.WriteBytesPerSecond, 1_000)
}

func TestIOPayloadHandlesCounterReset(t *testing.T) {
	previous := systeminfo.IOSnapshot{
		Disk: &systeminfo.DiskIOCounters{ReadBytes: 2_000},
	}
	current := systeminfo.IOSnapshot{
		Disk: &systeminfo.DiskIOCounters{ReadBytes: 100},
	}

	payload := ioPayload(previous, current, time.Second)

	assertRate(t, payload.Disk.ReadBytesPerSecond, 0)
}

func assertRate(t *testing.T, actual *float64, expected float64) {
	t.Helper()

	if actual == nil || *actual != expected {
		t.Fatalf("expected rate %.2f, got %v", expected, actual)
	}
}
