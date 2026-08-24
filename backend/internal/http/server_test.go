package httpserver

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"sync/atomic"
	"testing"
	"time"

	"github.com/ipetinate/glass-stack/backend/internal/events"
)

func TestServerGracefullyStopsMetricsAndClosesDatabase(t *testing.T) {
	t.Parallel()

	started := make(chan struct{})
	database := &lifecycleDatabase{}
	runtime := NewRuntime()
	runtime.Address = "127.0.0.1:0"
	runtime.Logger = slog.New(slog.NewTextHandler(io.Discard, nil))
	runtime.Database = database
	runtime.Metrics = metricsRunnerFunc(func(ctx context.Context, _ events.Publisher, _ time.Duration) error {
		close(started)
		<-ctx.Done()
		return ctx.Err()
	})
	server := NewServerWithRuntime(runtime)
	ctx, cancel := context.WithCancel(context.Background())
	result := make(chan error, 1)
	go func() {
		result <- server.Start(ctx)
	}()

	select {
	case <-started:
	case <-time.After(2 * time.Second):
		t.Fatal("metrics pipeline did not start")
	}
	cancel()

	select {
	case err := <-result:
		if err != nil {
			t.Fatalf("Start() error = %v", err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("server did not stop")
	}
	if count := database.closeCount.Load(); count != 1 {
		t.Fatalf("database close count = %d, want 1", count)
	}
}

func TestServerLeavesWriteTimeoutDisabledForSSE(t *testing.T) {
	server := NewServerWithRuntime(NewRuntime())

	if server.httpServer.WriteTimeout != 0 {
		t.Fatalf("SSE write timeout = %s, want disabled", server.httpServer.WriteTimeout)
	}
}

func TestServerStopsWhenMetricsPipelineFails(t *testing.T) {
	t.Parallel()

	metricsError := errors.New("publisher unavailable")
	database := &lifecycleDatabase{}
	runtime := NewRuntime()
	runtime.Address = "127.0.0.1:0"
	runtime.Logger = slog.New(slog.NewTextHandler(io.Discard, nil))
	runtime.Database = database
	runtime.Metrics = metricsRunnerFunc(func(
		context.Context,
		events.Publisher,
		time.Duration,
	) error {
		return metricsError
	})

	err := NewServerWithRuntime(runtime).Start(context.Background())

	if !errors.Is(err, metricsError) {
		t.Fatalf("Start() error = %v, want metrics failure", err)
	}
	if count := database.closeCount.Load(); count != 1 {
		t.Fatalf("database close count = %d, want 1", count)
	}
}

type metricsRunnerFunc func(context.Context, events.Publisher, time.Duration) error

func (run metricsRunnerFunc) Run(
	ctx context.Context,
	publisher events.Publisher,
	period time.Duration,
) error {
	return run(ctx, publisher, period)
}

type lifecycleDatabase struct {
	closeCount atomic.Int32
}

func (*lifecycleDatabase) QuickCheck(context.Context) error {
	return nil
}

func (*lifecycleDatabase) DropAllTables(context.Context) error {
	return nil
}

func (database *lifecycleDatabase) Close() error {
	database.closeCount.Add(1)
	return nil
}
