package menu

import (
	"context"
	stderrors "errors"
	"os"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"golang.org/x/sys/unix"
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
	stop, err := watchCancel(ctx)
	if err != nil {
		errorChannel <- err
		return
	}
	defer stop()
	buffer := make([]byte, 32*1024)
	for {
		ready, err := waitInput(input)
		if err != nil {
			errorChannel <- err
			return
		}
		if !ready || ctx.Err() != nil {
			return
		}
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
		if err == nil || canRetryRead(err) {
			continue
		}
		if ctx.Err() != nil {
			return
		}
		errorChannel <- err
		return
	}
}

func canRetryRead(err error) bool {
	return stderrors.Is(err, os.ErrDeadlineExceeded) || stderrors.Is(err, unix.EAGAIN)
}
