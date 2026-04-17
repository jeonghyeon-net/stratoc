package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/jeonghyeon-net/stratoc/01_SERVER/internal/session"
)

func (server *Server) create(writer http.ResponseWriter, request *http.Request) {
	request.Body = http.MaxBytesReader(writer, request.Body, maximumCreateBodyBytes)
	defer request.Body.Close()
	payload := session.CreateRequest{}
	if err := json.NewDecoder(request.Body).Decode(&payload); err != nil {
		writeError(writer, http.StatusBadRequest, fmt.Sprintf("decode request: %v", err))
		return
	}
	name, err := server.manager.Create(request.Context(), payload)
	if err != nil {
		writeSessionError(writer, err)
		return
	}
	writeJSON(writer, http.StatusCreated, map[string]string{"created": name})
}
