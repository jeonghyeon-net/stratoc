package menu

func applyMove(menu *Menu, state *state, event string) bool {
	switch event {
	case "up":
		moveUp(state)
	case "down":
		moveDown(state)
	case "page-up":
		movePageUp(menu, state)
	case "page-down":
		movePageDown(menu, state)
	case "home":
		moveHome(state)
	case "end":
		moveEnd(state)
	default:
		return false
	}
	return true
}

func moveUp(state *state)                   { moveCurrent(state, -1) }
func moveDown(state *state)                 { moveCurrent(state, 1) }
func moveHome(state *state)                 { moveTo(state, 0) }
func movePageUp(menu *Menu, state *state)   { moveCurrent(state, -pageSize(menu, *state)) }
func movePageDown(menu *Menu, state *state) { moveCurrent(state, pageSize(menu, *state)) }

func moveEnd(state *state) {
	if state.View == viewServers {
		moveTo(state, len(state.Hosts)-1)
		return
	}
	moveTo(state, len(state.Sessions)-1)
}

func moveCurrent(state *state, delta int) {
	if state.View == viewServers {
		moveTo(state, state.HostIndex+delta)
		state.HostError = ""
		return
	}
	moveTo(state, state.SessionIdx+delta)
	state.SessionErr = ""
}

func moveTo(state *state, index int) {
	if state.View == viewServers {
		state.HostIndex = clampIndex(index, len(state.Hosts))
		return
	}
	state.SessionIdx = clampIndex(index, len(state.Sessions))
}

func clampIndex(index int, total int) int {
	if total < 1 || index < 0 {
		return 0
	}
	if index >= total {
		return total - 1
	}
	return index
}
