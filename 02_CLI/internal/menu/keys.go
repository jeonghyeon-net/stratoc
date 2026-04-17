package menu

func (menu *Menu) applyKey(state state, event string) (action, bool, error) {
	switch event {
	case "quit":
		return action{}, true, errInterrupted
	case "refresh":
		return action{Kind: "refresh"}, true, nil
	case "create":
		if state.View == viewServers {
			return action{Kind: "add-server"}, true, nil
		}
		return action{Kind: "add-session"}, true, nil
	case "delete":
		if state.View == viewServers {
			if !state.savedHostSelected() {
				return action{}, false, nil
			}
			return action{Kind: "remove-server"}, true, nil
		}
		return action{Kind: "remove-session"}, true, nil
	case "left":
		if state.View == viewSessions {
			return action{Kind: "back"}, true, nil
		}
	case "enter":
		if state.View == viewServers {
			return action{Kind: "open-host"}, true, nil
		}
		if needsAuthorization(state.SessionErr) {
			return action{Kind: "open-host"}, true, nil
		}
		if len(state.Sessions) > 0 && state.SessionErr == "" {
			return action{Kind: "connect-session"}, true, nil
		}
	}
	return action{}, false, nil
}
