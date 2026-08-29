package httpserver

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"time"
)

type Server struct {
	httpServer *http.Server
	runtime    *Runtime
}

func NewServer() *Server {
	return NewServerWithRuntime(NewRuntime())
}

func NewServerWithRuntime(runtime *Runtime) *Server {
	address := runtime.Address
	if address == "" {
		address = ":8070"
	}
	return &Server{
		runtime: runtime,
		httpServer: &http.Server{
			Addr:              address,
			Handler:           NewRouterWithRuntime(runtime),
			ReadHeaderTimeout: 5 * time.Second,
			ReadTimeout:       30 * time.Second,
			// SSE endpoints intentionally keep a response open for the
			// lifetime of the browser session. A write deadline would close
			// the metrics stream after 30 seconds even while the server is
			// healthy.
			WriteTimeout: 0,
			IdleTimeout:  60 * time.Second,
		},
	}
}

func (server *Server) Start(parent context.Context) (result error) {
	logger := server.runtime.Logger
	if logger == nil {
		logger = slog.Default()
	}
	defer func() {
		if server.runtime.Database == nil {
			return
		}
		if err := server.runtime.Database.Close(); err != nil {
			result = errors.Join(result, fmt.Errorf("close control-plane database: %w", err))
		}
	}()

	metricsContext, cancelMetrics := context.WithCancel(parent)
	defer cancelMetrics()
	metricsDone := make(chan struct{})
	var metricsErrors <-chan error
	if server.runtime.Metrics != nil && server.runtime.Broker != nil {
		channel := make(chan error, 1)
		metricsErrors = channel
		go func() {
			defer close(metricsDone)
			channel <- server.runtime.Metrics.Run(
				metricsContext,
				server.runtime.Broker,
				server.runtime.MetricPeriod,
			)
		}()
	} else {
		close(metricsDone)
	}

	if server.runtime.Store != nil {
		storeContext, cancelStore := context.WithCancel(parent)
		go func() {
			server.runtime.Store.Run(storeContext)
			cancelStore()
		}()
		defer cancelStore()
	}

	serverErrors := make(chan error, 1)
	go func() {
		logger.Info("http server started", "address", server.httpServer.Addr)
		serverErrors <- server.httpServer.ListenAndServe()
	}()

	select {
	case err := <-serverErrors:
		cancelMetrics()
		<-metricsDone
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return fmt.Errorf("serve HTTP: %w", err)
	case err := <-metricsErrors:
		if errors.Is(err, context.Canceled) && parent.Err() != nil {
			return server.shutdown(logger, parent.Err(), cancelMetrics, metricsDone, serverErrors)
		}
		if err == nil {
			err = errors.New("host metrics pipeline stopped unexpectedly")
		}
		logger.Error("host metrics pipeline stopped", "error", err)
		shutdownError := server.shutdown(
			logger,
			err,
			cancelMetrics,
			metricsDone,
			serverErrors,
		)
		return errors.Join(
			fmt.Errorf("run host metrics pipeline: %w", err),
			shutdownError,
		)
	case <-parent.Done():
		return server.shutdown(logger, parent.Err(), cancelMetrics, metricsDone, serverErrors)
	}
}

func (server *Server) shutdown(
	logger *slog.Logger,
	reason error,
	cancelMetrics context.CancelFunc,
	metricsDone <-chan struct{},
	serverErrors <-chan error,
) error {
	shutdownContext, cancelShutdown := context.WithTimeout(
		context.Background(),
		10*time.Second,
	)
	defer cancelShutdown()

	logger.Info("shutting down http server", "reason", reason)
	shutdownError := server.httpServer.Shutdown(shutdownContext)
	cancelMetrics()
	<-metricsDone
	serverError := <-serverErrors
	if errors.Is(serverError, http.ErrServerClosed) {
		serverError = nil
	}
	return errors.Join(shutdownError, serverError)
}
