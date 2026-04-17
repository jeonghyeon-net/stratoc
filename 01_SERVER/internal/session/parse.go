package session

import (
	"bytes"
	"fmt"
	"slices"
	"strconv"
	"strings"
	"time"
)

func parseList(output []byte) ([]Item, error) {
	trimmed := bytes.TrimSpace(output)
	if len(trimmed) == 0 {
		return nil, nil
	}
	lines := strings.Split(string(trimmed), "\n")
	items := make([]Item, 0, len(lines))
	for _, line := range lines {
		item, err := parseLine(line)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	slices.SortFunc(items, func(left Item, right Item) int {
		return strings.Compare(left.Name, right.Name)
	})
	return items, nil
}

func parseLine(line string) (Item, error) {
	parts := strings.SplitN(line, "\t", 6)
	if len(parts) != 6 {
		return Item{}, fmt.Errorf("unexpected tmux list-sessions output: %q", line)
	}
	attached, err := strconv.Atoi(parts[1])
	if err != nil {
		return Item{}, fmt.Errorf("parse attached count for %q: %w", parts[0], err)
	}
	windows, err := strconv.Atoi(parts[2])
	if err != nil {
		return Item{}, fmt.Errorf("parse window count for %q: %w", parts[0], err)
	}
	created, err := strconv.ParseInt(parts[3], 10, 64)
	if err != nil {
		return Item{}, fmt.Errorf("parse creation timestamp for %q: %w", parts[0], err)
	}
	return Item{
		Name: parts[0], Title: chooseTitle(parts[4], parts[5], parts[0]),
		Attached: attached, Windows: windows, CreatedAt: time.Unix(created, 0).UTC(),
	}, nil
}

func chooseTitle(values ...string) string {
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value != "" {
			return value
		}
	}
	return ""
}
