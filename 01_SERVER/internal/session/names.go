package session

import (
	"context"
	"fmt"
	"strconv"
	"strings"
)

const sessionPrefix = "session-"

func (manager *Manager) nextName(ctx context.Context) (string, error) {
	items, err := manager.List(ctx)
	if err != nil {
		return "", err
	}
	next := 1
	for _, item := range items {
		value, ok := sessionNumber(item.Name)
		if ok && value >= next {
			next = value + 1
		}
	}
	return fmt.Sprintf("%s%04d", sessionPrefix, next), nil
}

func sessionNumber(name string) (int, bool) {
	if !strings.HasPrefix(name, sessionPrefix) {
		return 0, false
	}
	value, err := strconv.Atoi(strings.TrimPrefix(name, sessionPrefix))
	return value, err == nil
}
