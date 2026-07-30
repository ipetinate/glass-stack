package events

import (
	"context"
	"strconv"
	"sync"
)

// Publisher is the small contract consumed by event-producing services.
type Publisher interface {
	Publish(context.Context, Event) error
}

// Broker is a bounded in-process event broker. Slow subscribers lose old
// samples rather than blocking the host metrics loop indefinitely.
type Broker struct {
	mu          sync.RWMutex
	nextEventID uint64
	nextSubID   uint64
	buffer      int
	historySize int
	history     []Event
	subscribers map[uint64]chan Event
}

func NewBroker(bufferSize, historySize int) *Broker {
	if bufferSize < 1 {
		bufferSize = 1
	}
	if historySize < 0 {
		historySize = 0
	}

	return &Broker{
		buffer:      bufferSize,
		historySize: historySize,
		subscribers: make(map[uint64]chan Event),
	}
}

func (broker *Broker) Publish(context context.Context, event Event) error {
	if err := context.Err(); err != nil {
		return err
	}

	broker.mu.Lock()
	defer broker.mu.Unlock()

	broker.nextEventID++
	event.ID = strconv.FormatUint(broker.nextEventID, 10)
	if event.SchemaVersion == 0 {
		event.SchemaVersion = 1
	}

	if broker.historySize > 0 {
		broker.history = append(broker.history, event)
		if len(broker.history) > broker.historySize {
			broker.history = broker.history[len(broker.history)-broker.historySize:]
		}
	}

	for _, subscriber := range broker.subscribers {
		select {
		case subscriber <- event:
		default:
		}
	}

	return nil
}

type Subscription struct {
	events <-chan Event
	close  func()
	done   chan struct{}
	once   sync.Once
}

func (subscription *Subscription) Events() <-chan Event {
	return subscription.events
}

func (subscription *Subscription) Close() {
	subscription.once.Do(subscription.close)
}

func (broker *Broker) Subscribe(context context.Context) *Subscription {
	return broker.SubscribeAfter(context, "")
}

func (broker *Broker) SubscribeAfter(
	context context.Context,
	lastEventID string,
) *Subscription {
	afterID, _ := strconv.ParseUint(lastEventID, 10, 64)

	broker.mu.Lock()
	broker.nextSubID++
	subscriberID := broker.nextSubID
	subscriber := make(chan Event, broker.buffer)
	broker.subscribers[subscriberID] = subscriber
	history := broker.history
	if len(history) > broker.buffer {
		history = history[len(history)-broker.buffer:]
	}
	for _, event := range history {
		eventID, _ := strconv.ParseUint(event.ID, 10, 64)
		if afterID == 0 || eventID > afterID {
			subscriber <- event
		}
	}
	broker.mu.Unlock()

	done := make(chan struct{})
	subscription := &Subscription{
		events: subscriber,
		done:   done,
		close: func() {
			broker.mu.Lock()
			defer broker.mu.Unlock()
			if current, ok := broker.subscribers[subscriberID]; ok {
				delete(broker.subscribers, subscriberID)
				close(current)
			}
			close(done)
		},
	}

	if done := context.Done(); done != nil {
		go func() {
			select {
			case <-done:
				subscription.Close()
			case <-subscription.done:
			}
		}()
	}

	return subscription
}
