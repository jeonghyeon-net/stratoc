package menu

import (
	"strings"

	"github.com/jeonghyeon-net/stratoc/02_CLI/internal/hosts"
)

func hostRow(item hosts.Item) string {
	status := strings.TrimSpace(item.Status)
	if status == "" {
		return headerText(item.Label)
	}
	return headerText(item.Label) + "  " + hintText("["+status+"]")
}
