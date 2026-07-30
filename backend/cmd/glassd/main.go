package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/ipetinate/glass-stack/backend/internal/app"
)

func main() {
	application, err := app.New()
	if err != nil {
		slog.Error("failed to initialize glassd", "error", err)
		os.Exit(1)
	}

	context, stop := signal.NotifyContext(
		context.Background(),
		os.Interrupt,
		syscall.SIGTERM,
	)
	defer stop()

	if err := application.Run(context); err != nil {
		slog.Error("glassd stopped with error", "error", err)
		os.Exit(1)
	}
}
