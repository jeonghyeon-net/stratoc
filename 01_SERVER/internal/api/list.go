package api

import "net/http"

func (server *Server) list(writer http.ResponseWriter, request *http.Request) {
	items, err := server.manager.List(request.Context())
	if err != nil {
		writeError(writer, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(writer, http.StatusOK, normalizeAttached(items, server.registry))
}
