package api

import (
	"encoding/json"
	"net/http"
	"strings"
)

func writeJSON(writer http.ResponseWriter, status int, value any) {
	writer.Header().Set("Content-Type", "application/json")
	writer.WriteHeader(status)
	_ = json.NewEncoder(writer).Encode(value)
}

func writeError(writer http.ResponseWriter, status int, text string) {
	writeJSON(writer, status, map[string]string{"error": text})
}

func writeMethodNotAllowed(writer http.ResponseWriter, methods ...string) {
	writer.Header().Set("Allow", strings.Join(methods, ", "))
	writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
}
