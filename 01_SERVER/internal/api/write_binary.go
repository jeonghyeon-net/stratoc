package api

import (
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

func writeChunks(connection *websocket.Conn, mutex *sync.Mutex, chunks []*chunk) error {
	mutex.Lock()
	defer mutex.Unlock()
	_ = connection.SetWriteDeadline(time.Now().Add(writeWait))
	writer, err := connection.NextWriter(websocket.BinaryMessage)
	if err != nil {
		releaseChunks(chunks)
		return err
	}
	for _, item := range chunks {
		if _, err := writer.Write(item.data[:item.size]); err != nil {
			releaseChunks(chunks)
			_ = writer.Close()
			return err
		}
	}
	err = writer.Close()
	releaseChunks(chunks)
	return err
}

func releaseChunks(chunks []*chunk) {
	for _, item := range chunks {
		putChunk(item)
	}
}
