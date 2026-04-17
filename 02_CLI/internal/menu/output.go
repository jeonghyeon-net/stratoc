package menu

import (
	"encoding/json"
	"io"
	"os"

	"github.com/gorilla/websocket"
)

func readOutput(output *os.File, connection *websocket.Conn, errors chan<- error, reasons chan<- string) {
	for {
		kind, reader, err := connection.NextReader()
		if err != nil {
			errors <- err
			return
		}
		switch kind {
		case websocket.BinaryMessage:
			if err := copyStream(output, reader); err != nil {
				errors <- err
				return
			}
		case websocket.TextMessage:
			if err := readControl(reader, reasons); err != nil {
				errors <- err
				return
			}
		}
	}
}

func readControl(reader io.Reader, reasons chan<- string) error {
	control := message{}
	payload, err := io.ReadAll(reader)
	if err != nil {
		return err
	}
	if err := json.Unmarshal(payload, &control); err != nil {
		return err
	}
	if control.Type == "disconnect" && control.Reason != "" {
		select {
		case reasons <- control.Reason:
		default:
		}
	}
	return nil
}
