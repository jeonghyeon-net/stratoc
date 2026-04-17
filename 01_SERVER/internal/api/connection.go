package api

import (
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

func configureConnection(connection *websocket.Conn) {
	tuneNetConnection(connection.UnderlyingConn())
	connection.EnableWriteCompression(false)
	connection.SetReadLimit(readLimitBytes)
	_ = connection.SetReadDeadline(time.Now().Add(pongWait))
	connection.SetPongHandler(func(string) error {
		return connection.SetReadDeadline(time.Now().Add(pongWait))
	})
}

func writeSocketJSON(connection *websocket.Conn, mutex *sync.Mutex, value any) error {
	mutex.Lock()
	defer mutex.Unlock()
	_ = connection.SetWriteDeadline(time.Now().Add(writeWait))
	return connection.WriteJSON(value)
}

func writeSocketControl(connection *websocket.Conn, mutex *sync.Mutex, kind int, payload []byte) error {
	mutex.Lock()
	defer mutex.Unlock()
	_ = connection.SetWriteDeadline(time.Now().Add(writeWait))
	return connection.WriteControl(kind, payload, time.Now().Add(writeWait))
}
