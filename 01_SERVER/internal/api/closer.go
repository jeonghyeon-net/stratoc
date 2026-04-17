package api

import (
	"os"
	"sync"

	"github.com/gorilla/websocket"
)

type waiter interface {
	Wait() error
}

func newCloser(cancel func(), terminal *os.File, connection *websocket.Conn, mutex *sync.Mutex) func(string) {
	once := sync.Once{}
	return func(reason string) {
		once.Do(func() {
			if reason != "" {
				_ = writeSocketJSON(connection, mutex, message{Type: "disconnect", Reason: reason})
			}
			_ = writeSocketControl(connection, mutex, websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, reason))
			cancel()
			_ = terminal.Close()
			_ = connection.Close()
		})
	}
}

func closeWithError(connection *websocket.Conn, code int, text string) {
	mutex := &sync.Mutex{}
	_ = writeSocketControl(connection, mutex, websocket.CloseMessage, websocket.FormatCloseMessage(code, text))
	_ = connection.Close()
}
