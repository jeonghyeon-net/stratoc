package menu

import (
	"fmt"
	"strings"
)

func (menu *Menu) readEscape() (string, error) {
	sequence, err := menu.readEscapeSequence()
	if err != nil {
		return "quit", nil
	}
	switch sequence {
	case "[A", "OA":
		return "up", nil
	case "[B", "OB":
		return "down", nil
	case "[C", "OC":
		return "right", nil
	case "[D", "OD":
		return "left", nil
	case "[5~":
		return "page-up", nil
	case "[6~":
		return "page-down", nil
	case "[H", "OH", "[1~", "[7~":
		return "home", nil
	case "[F", "OF", "[4~", "[8~":
		return "end", nil
	}
	return parseMouseEvent(sequence), nil
}

func (menu *Menu) readEscapeSequence() (string, error) {
	sequence := make([]byte, 0, 16)
	buffer := []byte{0}
	for len(sequence) < cap(sequence) {
		if _, err := menu.stdin.Read(buffer); err != nil {
			return "", err
		}
		sequence = append(sequence, buffer[0])
		if finalEscapeByte(buffer[0]) {
			return string(sequence), nil
		}
	}
	return string(sequence), nil
}

func finalEscapeByte(value byte) bool {
	return value >= 'A' && value <= 'Z' || value >= 'a' && value <= 'z' || value == '~'
}

func parseMouseEvent(sequence string) string {
	if !strings.HasPrefix(sequence, "[<") {
		return ""
	}
	var code, x, y int
	var suffix byte
	if _, err := fmt.Sscanf(sequence, "[<%d;%d;%d%c", &code, &x, &y, &suffix); err != nil {
		return ""
	}
	switch code {
	case 64:
		return "up"
	case 65:
		return "down"
	}
	return ""
}
