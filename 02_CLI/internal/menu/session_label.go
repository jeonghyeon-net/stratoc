package menu

import (
	"strings"

	"github.com/jeonghyeon-net/stratoc/02_CLI/internal/remote"
)

func sessionLabel(item remote.Session) string {
	title := strings.TrimSpace(item.Title)
	if title != "" {
		return title
	}
	return item.Name
}
