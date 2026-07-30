package events

import (
	"context"
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
	nextID      uint64
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
	once   sync.Once
}

func (subscription *Subscription) Events() <-chan Event {
	return subscription.events
}

func (subscription *Subscription) Close() {
	subscription.once.Do(subscription.close)
}

func (broker *Broker) Subscribe(context context.Context) *Subscription {
	broker.mu.Lock()
	broker.nextID++
	id := broker.nextID
	subscriber := make(chan Event, broker.buffer)
	broker.subscribers[id] = subscriber
	for _, event := range broker.history {
		select {
		case subscriber <- event:
		default:
			break
		}
	}
	broker.mu.Unlock()

	subscription := &Subscription{
		events: subscriber,
		close: func() {
			broker.mu.Lock()
			defer broker.mu.Unlock()
			if current, ok := broker.subscribers[id]; ok {
				delete(broker.subscribers, id)
				close(current)
			}
		},
	}

	if done := context.Done(); done != nil {
		go func() {
			<-done
			subscription.Close()
		}()
	}

	return subscription
}
