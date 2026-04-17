package menu

import (
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

func bindConnection(connection *websocket.Conn, mutex *sync.Mutex) {
	connection.SetPingHandler(func(text string) error {
		_ = connection.SetReadDeadline(time.Now().Add(pongWait))
		return writeControl(connection, mutex, websocket.PongMessage, []byte(text))
	})
	connection.SetPongHandler(func(string) error {
		return connection.SetReadDeadline(time.Now().Add(pongWait))
	})
}
