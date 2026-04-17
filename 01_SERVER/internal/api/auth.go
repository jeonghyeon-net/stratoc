package api

import (
	"net/http"
	"strings"
)

func (server *Server) withAuth(next http.Handler) http.Handler {
	if server.token == "" {
		return next
	}
	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		header := strings.TrimSpace(request.Header.Get("Authorization"))
		if header == "" {
			writeError(writer, http.StatusUnauthorized, "authorization required")
			return
		}
		token := strings.TrimSpace(strings.TrimPrefix(header, "Bearer "))
		if token != server.token {
			writeError(writer, http.StatusUnauthorized, "wrong authorization token")
			return
		}
		next.ServeHTTP(writer, request)
	})
}
