package menu

func (menu *Menu) readKey() (string, error) {
	buffer := []byte{0}
	if _, err := menu.stdin.Read(buffer); err != nil {
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
		return menu.readEscape()
	}
	return "", nil
}
