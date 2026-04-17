package menu

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/jeonghyeon-net/stratoc/02_CLI/internal/remote"
)

const sessionPrefix = "session-"

func nextSessionName(items []remote.Session) string {
	next := 1
	for _, item := range items {
		value, ok := sessionNumber(item.Name)
		if ok && value >= next {
			next = value + 1
		}
	}
	return fmt.Sprintf("%s%04d", sessionPrefix, next)
}

func sessionNumber(name string) (int, bool) {
	if !strings.HasPrefix(name, sessionPrefix) {
		return 0, false
	}
	value, err := strconv.Atoi(strings.TrimPrefix(name, sessionPrefix))
	return value, err == nil
}
