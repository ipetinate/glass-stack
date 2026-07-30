package httpserver

import (
	"context"
	"errors"
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
		address = ":8080"
	}
	return &Server{
		runtime: runtime,
		httpServer: &http.Server{
			Addr:              address,
			Handler:           NewRouterWithRuntime(runtime),
			ReadHeaderTimeout: 5 * time.Second,
			ReadTimeout:       30 * time.Second,
			WriteTimeout:      30 * time.Second,
			IdleTimeout:       60 * time.Second,
		},
	}
}

func (server *Server) Start(parent context.Context) error {
	logger := server.runtime.Logger
	if logger == nil {
		logger = slog.Default()
	}

	metricsContext, cancelMetrics := context.WithCancel(parent)
	defer cancelMetrics()
	metricsDone := make(chan struct{})
	go func() {
		defer close(metricsDone)
		_ = server.runtime.Metrics.Run(
			metricsContext,
			server.runtime.Broker,
			server.runtime.MetricPeriod,
		)
	}()

	serverErrors := make(chan error, 1)
	go func() {
		logger.Info("http server started", "address", server.httpServer.Addr)
		serverErrors <- server.httpServer.ListenAndServe()
	}()

	select {
	case err := <-serverErrors:
		cancelMetrics()
		<-metricsDone
		if server.runtime.Database != nil {
			_ = server.runtime.Database.Close()
		}
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	case <-parent.Done():
		shutdownContext, cancelShutdown := context.WithTimeout(
			context.Background(),
			10*time.Second,
		)
		defer cancelShutdown()

		logger.Info("shutting down http server", "reason", parent.Err())
		shutdownError := server.httpServer.Shutdown(shutdownContext)
		cancelMetrics()
		<-metricsDone
		if shutdownError != nil {
			return shutdownError
		}
		if server.runtime.Database != nil {
			return server.runtime.Database.Close()
		}
		return nil
	}
}
