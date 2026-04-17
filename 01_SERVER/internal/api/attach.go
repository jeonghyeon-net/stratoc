package api

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"

	"github.com/gorilla/websocket"
)

func (server *Server) handleAttach(writer http.ResponseWriter, request *http.Request, name string) {
	if request.Method != http.MethodGet {
		writeMethodNotAllowed(writer, http.MethodGet)
		return
	}
	responseHeaders := http.Header{"Cache-Control": {"no-store"}}
	connection, err := server.upgrader.Upgrade(writer, request, responseHeaders)
	if err != nil {
		return
	}
	configureConnection(connection)
	ctx, cancel := context.WithCancel(context.Background())
	command, err := server.manager.AttachCommand(ctx, name)
	if err != nil {
		cancel()
		closeWithError(connection, websocket.ClosePolicyViolation, err.Error())
		return
	}
	terminal, err := startTerminal(command, request)
	if err != nil {
		cancel()
		closeWithError(connection, websocket.CloseInternalServerErr, fmt.Sprintf("start tmux attach: %v", err))
		return
	}
	server.runAttach(name, cancel, command, terminal, connection)
}

func (server *Server) runAttach(name string, cancel context.CancelFunc, command waiter, terminal *os.File, connection *websocket.Conn) {
	var writeMutex sync.Mutex
	bindConnection(connection, &writeMutex)
	closeConnection := newCloser(cancel, terminal, connection, &writeMutex)
	dropPrevious, unregister := server.registry.put(name, closeConnection)
	defer unregister()
	dropPrevious()
	chunks := make(chan *chunk, 64)
	result := make(chan error, 5)
	go pumpTerminal(terminal, chunks, result)
	go flushTerminal(connection, &writeMutex, chunks, result)
	go writeTerminal(terminal, connection, &writeMutex, result)
	go keepAlive(connection, &writeMutex, result)
	go func() { result <- command.Wait() }()
	if err := <-result; err != nil && !isExpectedClose(err) {
		log.Printf("attach %s ended: %v", name, err)
		closeConnection(err.Error())
		return
	}
	closeConnection("")
}
