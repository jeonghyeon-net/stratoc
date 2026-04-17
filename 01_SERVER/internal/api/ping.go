package api

import (
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

func keepAlive(connection *websocket.Conn, mutex *sync.Mutex, result chan<- error) {
	ticker := time.NewTicker(pingInterval)
	defer ticker.Stop()
	for range ticker.C {
		if err := writeSocketControl(connection, mutex, websocket.PingMessage, nil); err != nil {
			result <- err
			return
		}
	}
}
