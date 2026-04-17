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
	setNonblock(input, true)
	defer setNonblock(input, false)
	buffer := make([]byte, 32*1024)
	for {
		if ctx.Err() != nil {
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
		if err == nil {
			continue
		}
		if canRetryRead(err) {
			time.Sleep(10 * time.Millisecond)
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

func setNonblock(input *os.File, enabled bool) {
	_ = unix.SetNonblock(int(input.Fd()), enabled)
}

func interruptRead(input *os.File) { _ = input.SetReadDeadline(time.Now()) }
func resetRead(input *os.File)     { _ = input.SetReadDeadline(time.Time{}) }
