package api

import (
	"sync"

	"github.com/gorilla/websocket"
)

func flushTerminal(connection *websocket.Conn, mutex *sync.Mutex, chunks <-chan *chunk, result chan<- error) {
	var carry *chunk
	for {
		pending, ok := nextBatch(chunks, carry)
		carry = nil
		if !ok {
			return
		}
		if len(pending) > 0 {
			last := pending[len(pending)-1]
			if last.size < 0 {
				carry = last
				pending = pending[:len(pending)-1]
			}
		}
		if len(pending) == 0 {
			continue
		}
		if err := writeChunks(connection, mutex, pending); err != nil {
			result <- err
			return
		}
	}
}

func nextBatch(chunks <-chan *chunk, carry *chunk) ([]*chunk, bool) {
	item, ok := takeChunk(chunks, carry)
	if !ok {
		return nil, false
	}
	pending := []*chunk{item}
	bytes := item.size
	for bytes < maxFrameBytes {
		select {
		case item, ok := <-chunks:
			if !ok {
				return pending, true
			}
			if bytes+item.size > maxFrameBytes {
				item.size = -item.size
				return append(pending, item), true
			}
			pending, bytes = appendChunk(pending, bytes, item)
		default:
			return pending, true
		}
	}
	return pending, true
}

func takeChunk(chunks <-chan *chunk, carry *chunk) (*chunk, bool) {
	if carry != nil {
		carry.size = -carry.size
		return carry, true
	}
	item, ok := <-chunks
	return item, ok
}

func appendChunk(pending []*chunk, bytes int, item *chunk) ([]*chunk, int) {
	return append(pending, item), bytes + item.size
}
