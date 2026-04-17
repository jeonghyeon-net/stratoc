package menu

func applyMove(state *state, event string) bool {
	switch event {
	case "up":
		moveUp(state)
		return true
	case "down":
		moveDown(state)
		return true
	default:
		return false
	}
}

func moveUp(state *state) {
	if state.View == viewServers {
		if state.HostIndex > 0 {
			state.HostIndex--
			state.HostError = ""
		}
		return
	}
	if state.SessionIdx > 0 {
		state.SessionIdx--
		state.SessionErr = ""
	}
}

func moveDown(state *state) {
	if state.View == viewServers {
		if state.HostIndex+1 < len(state.Hosts) {
			state.HostIndex++
			state.HostError = ""
		}
		return
	}
	if state.SessionIdx+1 < len(state.Sessions) {
		state.SessionIdx++
		state.SessionErr = ""
	}
}
