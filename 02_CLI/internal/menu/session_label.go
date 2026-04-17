package menu

import (
	"strings"

	"github.com/jeonghyeon-net/stratoc/02_CLI/internal/remote"
)

func sessionLabel(item remote.Session) string {
	title := sanitizeText(item.Title)
	if title != "" {
		return title
	}
	return sanitizeText(item.Name)
}

func sanitizeText(value string) string {
	value = strings.TrimSpace(value)
	return strings.Map(func(r rune) rune {
		if r < 32 || r == 127 {
			return -1
		}
		return r
	}, value)
}
