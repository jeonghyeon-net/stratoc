package api

import "net/http"

func (server *Server) remove(writer http.ResponseWriter, request *http.Request, name string) {
	if err := server.manager.Delete(request.Context(), name); err != nil {
		writeSessionError(writer, err)
		return
	}
	writeJSON(writer, http.StatusOK, map[string]string{"deleted": name})
}
