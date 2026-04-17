package api

import "net/http"

func (server *Server) handleSessions(writer http.ResponseWriter, request *http.Request) {
	switch request.Method {
	case http.MethodGet:
		server.list(writer, request)
	case http.MethodPost:
		server.create(writer, request)
	default:
		writeMethodNotAllowed(writer, http.MethodGet, http.MethodPost)
	}
}
