package menu

import (
	"bufio"
	"fmt"
	"strings"
)

func (menu *Menu) prompt(label string, required bool) (string, error) {
	if err := menu.pauseRaw(); err != nil {
		return "", err
	}
	defer func() { _ = menu.resumeRaw() }()
	reader := bufio.NewReader(menu.stdin)
	for {
		fmt.Fprint(menu.stdout, "\x1b[?25h\x1b[2J\x1b[H")
		fmt.Fprintf(menu.stdout, "%s: ", label)
		value, err := reader.ReadString('\n')
		if err != nil {
			return "", err
		}
		value = strings.TrimSpace(value)
		if !required || value != "" {
			fmt.Fprint(menu.stdout, "\x1b[2J\x1b[3J\x1b[H\x1b[?25l")
			return value, nil
		}
		fmt.Fprint(menu.stdout, "\x1b[2K\r값 필요\r\n")
	}
}
