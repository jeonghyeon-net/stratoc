package api

import "net/http"

func (server *Server) Handler() http.Handler {
	apiMux := http.NewServeMux()
	apiMux.HandleFunc("/api/sessions", server.handleSessions)
	apiMux.HandleFunc("/api/sessions/", server.handleSession)
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", server.handleHealth)
	mux.Handle("/api/", server.withAuth(apiMux))
	return mux
}

func (server *Server) handleHealth(writer http.ResponseWriter, _ *http.Request) {
	writeJSON(writer, http.StatusOK, map[string]string{"status": "ok"})
}
