package api

import (
	"net/http"

	"github.com/gorilla/websocket"
	"github.com/jeonghyeon-net/stratoc/01_SERVER/internal/session"
)

const maximumCreateBodyBytes = 8 * 1024

type Server struct {
	manager  *session.Manager
	registry *registry
	token    string
	upgrader websocket.Upgrader
}

func New(manager *session.Manager, token string) *Server {
	return &Server{
		manager:  manager,
		registry: newRegistry(),
		token:    token,
		upgrader: websocket.Upgrader{
			CheckOrigin:       func(*http.Request) bool { return true },
			EnableCompression: false,
			ReadBufferSize:    readBufferBytes,
			WriteBufferSize:   readBufferBytes,
			WriteBufferPool:   websocketBufferPool,
		},
	}
}
