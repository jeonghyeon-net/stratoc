package menu

func hostRows(menu *Menu, state state, actions []string) int {
	reserved := len(actions) + 1
	if state.HostError != "" {
		reserved += 2
	}
	return availableRows(menu, reserved)
}

func sessionRows(menu *Menu, state state, actions []string) int {
	reserved := len(actions) + 2
	if state.SessionErr != "" || len(state.Sessions) > 0 {
		reserved++
	}
	return availableRows(menu, reserved)
}

func availableRows(menu *Menu, reserved int) int {
	available := terminalHeight(menu.stdout) - reserved
	if available < 1 {
		return 1
	}
	return available
}
