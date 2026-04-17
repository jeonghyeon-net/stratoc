package menu

import (
	"errors"
	"io"
	"sync"

	"github.com/gorilla/websocket"
)

func finish(connection *websocket.Conn, mutex *sync.Mutex, errorChannel <-chan error, reasons <-chan string) error {
	err := <-errorChannel
	_ = writeControl(connection, mutex, websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, "client closing"))
	if errors.Is(err, io.EOF) {
		return nil
	}
	closeError := &websocket.CloseError{}
	if errors.As(err, &closeError) {
		select {
		case <-reasons:
		default:
		}
		return nil
	}
	return err
}
