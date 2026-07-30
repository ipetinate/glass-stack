package app

import (
	"context"

	httpserver "github.com/ipetinate/glass-stack/backend/internal/http"
)

type App struct {
	server *httpserver.Server
}

func New() (*App, error) {
	runtime, err := newRuntime()
	if err != nil {
		return nil, err
	}
	return &App{server: httpserver.NewServerWithRuntime(runtime)}, nil
}

func (app *App) Run(ctx context.Context) error {
	return app.server.Start(ctx)
}
