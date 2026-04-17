package api

import (
	"context"
	"errors"
	"io"
	"net/http"

	"github.com/gorilla/websocket"
	"github.com/jeonghyeon-net/stratoc/01_SERVER/internal/session"
)

func writeSessionError(writer http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, session.ErrInvalidName):
		writeError(writer, http.StatusBadRequest, err.Error())
	case errors.Is(err, session.ErrExists):
		writeError(writer, http.StatusConflict, err.Error())
	case errors.Is(err, session.ErrNotFound):
		writeError(writer, http.StatusNotFound, err.Error())
	default:
		writeError(writer, http.StatusInternalServerError, err.Error())
	}
}

func isExpectedClose(err error) bool {
	if err == nil || errors.Is(err, io.EOF) || errors.Is(err, context.Canceled) {
		return true
	}
	var closeError *websocket.CloseError
	return errors.As(err, &closeError)
}
