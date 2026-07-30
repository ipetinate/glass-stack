package logging

import (
	"log/slog"
	"os"
)

const (
	Development = "development"
	Production  = "production"
)

func New(environment string) *slog.Logger {
	options := &slog.HandlerOptions{Level: slog.LevelInfo}

	var handler slog.Handler
	if environment == Production {
		handler = slog.NewJSONHandler(os.Stdout, options)
	} else {
		handler = newPrettyHandler(os.Stdout, options)
	}

	return slog.New(handler).With(
		"service", "glassd",
		"environment", environment,
	)
}
