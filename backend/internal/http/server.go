package httpserver

import (
	"fmt"
	"net/http"
)

type Server struct {
	httpServer *http.Server
}

func NewServer() *Server {
	return &Server{
		httpServer: &http.Server{
			Addr:    ":8080",
			Handler: NewRouter(),
		},
	}
}

func (server *Server) Start() error {
	fmt.Printf("Glass API running on: http://localhost%s", server.httpServer.Addr)

	return server.httpServer.ListenAndServe()
}
