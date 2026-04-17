package api

import (
	"net/http"
	"strings"
)

func (server *Server) handleSession(writer http.ResponseWriter, request *http.Request) {
	name, action := splitPath(request.URL.Path)
	if name == "" {
		writeError(writer, http.StatusNotFound, "session not found")
		return
	}
	if action == "attach" {
		server.handleAttach(writer, request, name)
		return
	}
	if action != "" {
		writeError(writer, http.StatusNotFound, "route not found")
		return
	}
	if request.Method != http.MethodDelete {
		writeMethodNotAllowed(writer, http.MethodDelete)
		return
	}
	server.remove(writer, request, name)
}

func splitPath(path string) (string, string) {
	parts := strings.Split(strings.TrimPrefix(path, "/api/sessions/"), "/")
	if len(parts) == 0 {
		return "", ""
	}
	name := parts[0]
	if len(parts) == 1 {
		return name, ""
	}
	return name, parts[1]
}
