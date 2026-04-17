package menu

import (
	"fmt"
	"strings"
	"time"

	"github.com/jeonghyeon-net/stratoc/02_CLI/internal/remote"
)

func sessionRow(item remote.Session) string {
	parts := []string{sessionLabel(item)}
	if attached := sessionAttachedText(item.Attached); attached != "" {
		parts = append(parts, statusText(attached))
	}
	if created := sessionCreatedAt(item.CreatedAt); created != "" {
		parts = append(parts, hintText(created))
	}
	return strings.Join(parts, "  ")
}

func sessionAttachedText(attached int) string {
	if attached <= 0 {
		return ""
	}
	if attached == 1 {
		return "사용 중"
	}
	return fmt.Sprintf("사용 중 %d", attached)
}

func sessionCreatedAt(raw string) string {
	if raw == "" {
		return ""
	}
	created, err := time.Parse(time.RFC3339Nano, raw)
	if err != nil {
		return ""
	}
	return created.Local().Format("2006-01-02 15:04")
}
