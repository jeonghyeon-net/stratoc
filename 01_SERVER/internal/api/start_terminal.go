package api

import (
	"net/http"
	"os"
	"os/exec"
	"strconv"

	"github.com/creack/pty"
)

func startTerminal(command *exec.Cmd, request *http.Request) (*os.File, error) {
	size := readTerminalSize(request)
	if size == nil {
		return pty.Start(command)
	}
	return pty.StartWithSize(command, size)
}

func readTerminalSize(request *http.Request) *pty.Winsize {
	columns, err := strconv.Atoi(request.Header.Get("X-Terminal-Columns"))
	if err != nil || columns < 1 {
		return nil
	}
	rows, err := strconv.Atoi(request.Header.Get("X-Terminal-Rows"))
	if err != nil || rows < 1 {
		return nil
	}
	return &pty.Winsize{Cols: uint16(columns), Rows: uint16(rows)}
}
