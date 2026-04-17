package api

import (
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

func flushTerminal(connection *websocket.Conn, mutex *sync.Mutex, chunks <-chan *chunk, result chan<- error) {
	pending := []*chunk{}
	bytes := 0
	timer := time.NewTimer(time.Hour)
	stopTimer(timer)
	for {
		if len(pending) == 0 {
			item, ok := <-chunks
			if !ok {
				return
			}
			pending, bytes = appendChunk(pending, bytes, item)
			resetTimer(timer)
		}
		select {
		case item, ok := <-chunks:
			if !ok {
				result <- writeChunks(connection, mutex, pending)
				return
			}
			if bytes+item.size > maxFrameBytes {
				if err := writeChunks(connection, mutex, pending); err != nil {
					putChunk(item)
					result <- err
					return
				}
				pending, bytes = pending[:0], 0
			}
			pending, bytes = appendChunk(pending, bytes, item)
			resetTimer(timer)
		case <-timer.C:
			if err := writeChunks(connection, mutex, pending); err != nil {
				result <- err
				return
			}
			pending, bytes = pending[:0], 0
		}
	}
}

func appendChunk(pending []*chunk, bytes int, item *chunk) ([]*chunk, int) {
	return append(pending, item), bytes + item.size
}
