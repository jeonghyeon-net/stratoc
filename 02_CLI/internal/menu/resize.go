package menu

import (
	"os"
	"os/signal"
	"sync"
	"syscall"

	"github.com/gorilla/websocket"
	"golang.org/x/term"
)

func sendResize(output *os.File, connection *websocket.Conn, mutex *sync.Mutex) error {
	width, height, err := term.GetSize(int(output.Fd()))
	if err != nil {
		return err
	}
	return writeJSON(connection, mutex, message{Type: "resize", Columns: uint16(width), Rows: uint16(height)})
}

func watchResize(output *os.File, connection *websocket.Conn, mutex *sync.Mutex) func() {
	signals := make(chan os.Signal, 1)
	signal.Notify(signals, syscall.SIGWINCH)
	go func() {
		for range signals {
			_ = sendResize(output, connection, mutex)
		}
	}()
	return func() { signal.Stop(signals) }
}
