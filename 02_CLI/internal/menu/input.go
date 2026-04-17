package menu

import (
	"context"
	stderrors "errors"
	"os"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

func readInput(
	ctx context.Context,
	input *os.File,
	connection *websocket.Conn,
	mutex *sync.Mutex,
	errorChannel chan<- error,
	stopped chan<- struct{},
) {
	defer close(stopped)
	buffer := make([]byte, 32*1024)
	for {
		count, err := input.Read(buffer)
		if count > 0 {
			mutex.Lock()
			_ = connection.SetWriteDeadline(time.Now().Add(writeWait))
			writeErr := connection.WriteMessage(websocket.BinaryMessage, buffer[:count])
			mutex.Unlock()
			if writeErr != nil {
				errorChannel <- writeErr
				return
			}
		}
		if err == nil {
			continue
		}
		if ctx.Err() != nil && stderrors.Is(err, os.ErrDeadlineExceeded) {
			return
		}
		errorChannel <- err
		return
	}
}

func interruptRead(input *os.File) { _ = input.SetReadDeadline(time.Now()) }
func resetRead(input *os.File)     { _ = input.SetReadDeadline(time.Time{}) }
