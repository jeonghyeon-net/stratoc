package api

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"sync"

	"github.com/creack/pty"
	"github.com/gorilla/websocket"
)

func writeTerminal(terminal *os.File, connection *websocket.Conn, mutex *sync.Mutex, result chan<- error) {
	for {
		kind, reader, err := connection.NextReader()
		if err != nil {
			result <- err
			return
		}
		switch kind {
		case websocket.BinaryMessage:
			if err := copyStream(terminal, reader); err != nil {
				result <- err
				return
			}
		case websocket.TextMessage:
			if err := resizeTerminal(terminal, connection, mutex, reader); err != nil {
				result <- err
				return
			}
		}
	}
}

func resizeTerminal(terminal *os.File, connection *websocket.Conn, mutex *sync.Mutex, reader io.Reader) error {
	control := message{}
	payload, err := io.ReadAll(reader)
	if err != nil {
		return err
	}
	if err := json.Unmarshal(payload, &control); err != nil {
		return fmt.Errorf("decode control message: %w", err)
	}
	if control.Type != "resize" {
		return nil
	}
	if err := pty.Setsize(terminal, &pty.Winsize{Cols: control.Columns, Rows: control.Rows}); err != nil {
		_ = writeSocketJSON(connection, mutex, message{Type: "disconnect", Reason: err.Error()})
		return err
	}
	return nil
}
