package menu

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/jeonghyeon-net/stratoc/02_CLI/internal/remote"
	"golang.org/x/term"
)

func (menu *Menu) attach(ctx context.Context, client *remote.Client, name string) error {
	if err := menu.pauseRaw(); err != nil {
		return err
	}
	defer func() { _ = menu.resumeRaw() }()
	if !term.IsTerminal(int(menu.stdin.Fd())) || !term.IsTerminal(int(menu.stdout.Fd())) {
		return errors.New("interactive terminal 필요")
	}
	headers, sized := terminalHeaders(menu.stdout)
	connection, response, err := client.Dial(ctx, name, headers)
	if err != nil {
		if response != nil {
			defer response.Body.Close()
		}
		return err
	}
	defer connection.Close()
	configureConnection(connection)
	state, err := term.MakeRaw(int(menu.stdin.Fd()))
	if err != nil {
		return fmt.Errorf("enable raw mode: %w", err)
	}
	defer term.Restore(int(menu.stdin.Fd()), state)
	mutex := &sync.Mutex{}
	bindConnection(connection, mutex)
	if !sized {
		if err := sendResize(menu.stdout, connection, mutex); err != nil {
			return fmt.Errorf("send resize: %w", err)
		}
	}
	return menu.stream(connection, mutex)
}

func (menu *Menu) stream(connection *websocket.Conn, mutex *sync.Mutex) error {
	resizeStop := watchResize(menu.stdout, connection, mutex)
	defer resizeStop()
	errors := make(chan error, 3)
	reasons := make(chan string, 1)
	ctx, cancel := context.WithCancel(context.Background())
	stopped := make(chan struct{})
	go keepAlive(connection, mutex, errors)
	go readInput(ctx, menu.stdin, connection, mutex, errors, stopped)
	go readOutput(menu.stdout, connection, errors, reasons)
	err := finish(connection, mutex, errors, reasons)
	cancel()
	waitInputStop(stopped)
	return err
}

func waitInputStop(stopped <-chan struct{}) {
	select {
	case <-stopped:
	case <-time.After(100 * time.Millisecond):
	}
}
