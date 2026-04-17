package session

import "strings"

func hasDuplicate(output []byte) bool {
	return strings.Contains(strings.ToLower(string(output)), "duplicate session")
}

func hasMissing(output []byte) bool {
	text := strings.ToLower(string(output))
	return strings.Contains(text, "can't find session") || strings.Contains(text, "no such session")
}

func hasNoServer(output []byte) bool {
	text := strings.ToLower(string(output))
	return strings.Contains(text, "no server running on") || strings.Contains(text, "failed to connect to server") || strings.Contains(text, "error connecting to")
}
