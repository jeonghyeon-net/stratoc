package menu

import (
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

func keepAlive(connection *websocket.Conn, mutex *sync.Mutex, errors chan<- error) {
	ticker := time.NewTicker(pingInterval)
	defer ticker.Stop()
	for range ticker.C {
		mutex.Lock()
		err := connection.WriteControl(websocket.PingMessage, nil, time.Now().Add(writeWait))
		mutex.Unlock()
		if err != nil {
			errors <- err
			return
		}
	}
}
