package menu

func (menu *Menu) readKey() (string, error) {
	buffer := []byte{0, 0, 0}
	if _, err := menu.stdin.Read(buffer[:1]); err != nil {
		return "", err
	}
	switch buffer[0] {
	case 'q', 3:
		return "quit", nil
	case 'r', 'R':
		return "refresh", nil
	case 'c', 'C':
		return "create", nil
	case 'd', 'D':
		return "delete", nil
	case 'k':
		return "up", nil
	case 'j':
		return "down", nil
	case '\t':
		return "tab", nil
	case '\r', '\n':
		return "enter", nil
	case 27:
		return menu.readEscape(buffer)
	}
	return "", nil
}

func (menu *Menu) readEscape(buffer []byte) (string, error) {
	if _, err := menu.stdin.Read(buffer[1:2]); err != nil {
		return "quit", nil
	}
	if buffer[1] != '[' && buffer[1] != 'O' {
		return "quit", nil
	}
	if _, err := menu.stdin.Read(buffer[2:3]); err != nil {
		return "quit", nil
	}
	switch buffer[2] {
	case 'A':
		return "up", nil
	case 'B':
		return "down", nil
	case 'C':
		return "right", nil
	case 'D':
		return "left", nil
	}
	return "", nil
}
