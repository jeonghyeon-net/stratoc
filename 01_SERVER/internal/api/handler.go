package api

import "net/http"

func (server *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", server.handleHealth)
	mux.HandleFunc("/api/sessions", server.handleSessions)
	mux.HandleFunc("/api/sessions/", server.handleSession)
	return server.withAuth(mux)
}

func (server *Server) handleHealth(writer http.ResponseWriter, _ *http.Request) {
	writeJSON(writer, http.StatusOK, map[string]string{"status": "ok"})
}
