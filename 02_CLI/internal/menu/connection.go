package menu

import (
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

func configureConnection(connection *websocket.Conn) {
	connection.EnableWriteCompression(false)
	connection.SetReadLimit(readLimitBytes)
	_ = connection.SetReadDeadline(time.Now().Add(pongWait))
}

func writeJSON(connection *websocket.Conn, mutex *sync.Mutex, value any) error {
	mutex.Lock()
	defer mutex.Unlock()
	_ = connection.SetWriteDeadline(time.Now().Add(writeWait))
	return connection.WriteJSON(value)
}

func writeControl(connection *websocket.Conn, mutex *sync.Mutex, kind int, payload []byte) error {
	mutex.Lock()
	defer mutex.Unlock()
	_ = connection.SetWriteDeadline(time.Now().Add(writeWait))
	return connection.WriteControl(kind, payload, time.Now().Add(writeWait))
}
