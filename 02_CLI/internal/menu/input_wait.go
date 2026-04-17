package menu

import (
	"context"
	"os"

	"golang.org/x/sys/unix"
)

func watchCancel(ctx context.Context) (func(), error) {
	reader, writer, err := os.Pipe()
	if err != nil {
		return nil, err
	}
	done := make(chan struct{})
	go func() {
		select {
		case <-ctx.Done():
			_, _ = writer.Write([]byte{1})
		case <-done:
		}
		_ = writer.Close()
	}()
	cancelFD = int32(reader.Fd())
	return func() {
		close(done)
		cancelFD = -1
		_ = reader.Close()
		_ = writer.Close()
	}, nil
}

var cancelFD int32 = -1

func waitInput(input *os.File) (bool, error) {
	fds := []unix.PollFd{{Fd: int32(input.Fd()), Events: unix.POLLIN}}
	if cancelFD >= 0 {
		fds = append(fds, unix.PollFd{Fd: cancelFD, Events: unix.POLLIN})
	}
	for {
		_, err := unix.Poll(fds, -1)
		if err == unix.EINTR {
			continue
		}
		if err != nil {
			return false, err
		}
		if len(fds) > 1 && fds[1].Revents&unix.POLLIN != 0 {
			return false, nil
		}
		if fds[0].Revents&(unix.POLLIN|unix.POLLHUP|unix.POLLERR) != 0 {
			return true, nil
		}
	}
}
