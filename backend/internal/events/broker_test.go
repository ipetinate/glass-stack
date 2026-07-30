package events

import (
	"context"
	"testing"
	"time"
)

func TestBrokerReplaysRecentEventsToNewSubscribers(t *testing.T) {
	broker := NewBroker(4, 2)
	first := Event{Type: "temperature", OccurredAt: time.Now().UTC()}
	second := Event{Type: "cpu", OccurredAt: time.Now().UTC()}
	third := Event{Type: "gpu", OccurredAt: time.Now().UTC()}

	if err := broker.Publish(context.Background(), first); err != nil {
		t.Fatal(err)
	}
	if err := broker.Publish(context.Background(), second); err != nil {
		t.Fatal(err)
	}
	if err := broker.Publish(context.Background(), third); err != nil {
		t.Fatal(err)
	}

	subscription := broker.Subscribe(context.Background())
	defer subscription.Close()

	for _, expected := range []Event{second, third} {
		select {
		case actual := <-subscription.Events():
			if actual.Type != expected.Type {
				t.Fatalf("expected %q, got %q", expected.Type, actual.Type)
			}
			if actual.ID == "" || actual.SchemaVersion != 1 {
				t.Fatalf("event envelope = %+v", actual)
			}
		case <-time.After(time.Second):
			t.Fatal("timed out waiting for replayed event")
		}
	}
}

func TestBrokerResumesAfterLastEventID(t *testing.T) {
	t.Parallel()

	broker := NewBroker(4, 4)
	for _, eventType := range []string{"temperature", "cpu", "gpu"} {
		if err := broker.Publish(context.Background(), Event{
			Type:       eventType,
			OccurredAt: time.Now().UTC(),
		}); err != nil {
			t.Fatal(err)
		}
	}

	subscription := broker.SubscribeAfter(context.Background(), "2")
	defer subscription.Close()

	select {
	case event := <-subscription.Events():
		if event.ID != "3" || event.Type != "gpu" {
			t.Fatalf("resumed event = %+v", event)
		}
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for resumed event")
	}
	select {
	case event := <-subscription.Events():
		t.Fatalf("unexpected replayed event: %+v", event)
	default:
	}
}

func TestBrokerReplaysNewestEventsWhenSubscriberBufferIsSmaller(t *testing.T) {
	t.Parallel()

	broker := NewBroker(2, 4)
	for _, eventType := range []string{"temperature", "cpu", "gpu", "io"} {
		if err := broker.Publish(context.Background(), Event{
			Type:       eventType,
			OccurredAt: time.Now().UTC(),
		}); err != nil {
			t.Fatal(err)
		}
	}

	subscription := broker.Subscribe(context.Background())
	defer subscription.Close()
	for _, expected := range []string{"gpu", "io"} {
		select {
		case event := <-subscription.Events():
			if event.Type != expected {
				t.Fatalf("event type = %q, want %q", event.Type, expected)
			}
		case <-time.After(time.Second):
			t.Fatal("timed out waiting for replayed event")
		}
	}
}

func TestBrokerRemovesSubscriberWhenContextIsCanceled(t *testing.T) {
	broker := NewBroker(1, 0)
	context, cancel := context.WithCancel(context.Background())
	subscription := broker.Subscribe(context)
	cancel()
	defer subscription.Close()

	select {
	case _, open := <-subscription.Events():
		if open {
			t.Fatal("expected canceled subscription to close")
		}
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for subscription cleanup")
	}
}
