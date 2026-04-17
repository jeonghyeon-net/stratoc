package api

import (
	"io"
	"sync"
)

var copyPool = sync.Pool{New: func() any {
	return make([]byte, readBufferBytes)
}}

func copyStream(writer io.Writer, reader io.Reader) error {
	buffer := copyPool.Get().([]byte)
	defer copyPool.Put(buffer)
	_, err := io.CopyBuffer(writer, reader, buffer)
	return err
}
