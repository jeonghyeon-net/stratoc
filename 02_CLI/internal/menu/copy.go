package menu

import (
	stderrors "errors"
	"io"
	"os"
	"sync"
	"time"

	"golang.org/x/sys/unix"
)

var copyPool = sync.Pool{New: func() any {
	return make([]byte, readLimitBytes>>5)
}}

func copyStream(writer io.Writer, reader io.Reader) error {
	buffer := copyPool.Get().([]byte)
	defer copyPool.Put(buffer)
	for {
		count, err := reader.Read(buffer)
		if count > 0 {
			if err := writeAll(writer, buffer[:count]); err != nil {
				return err
			}
		}
		if err == nil {
			continue
		}
		if stderrors.Is(err, io.EOF) {
			return nil
		}
		return err
	}
}

func writeAll(writer io.Writer, data []byte) error {
	for len(data) > 0 {
		count, err := writer.Write(data)
		if count > 0 {
			data = data[count:]
		}
		if err == nil {
			continue
		}
		if stderrors.Is(err, os.ErrDeadlineExceeded) || stderrors.Is(err, unix.EAGAIN) {
			time.Sleep(10 * time.Millisecond)
			continue
		}
		return err
	}
	return nil
}
