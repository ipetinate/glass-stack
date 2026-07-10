package app

import (
	httpserver "github.com/ipetinate/glass-stack/backend/internal/http"
)

type App struct {
	server *httpserver.Server
}

func New() *App {
	return &App{
		server: httpserver.NewServer(),
	}
}

func (app *App) Run() error {
	return app.server.Start()
}
