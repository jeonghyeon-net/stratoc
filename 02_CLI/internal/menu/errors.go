package menu

import "github.com/jeonghyeon-net/stratoc/02_CLI/internal/remote"

func showError(state state, err error) state {
	if err == nil {
		return state
	}
	message := err.Error()
	if remote.IsWrongAuthorizationToken(err) {
		message = authWrongTokenText
	}
	if remote.IsAuthRequired(err) {
		message = authRequiredText
	}
	if state.View == viewSessions {
		state.SessionErr = message
		return state
	}
	state.HostError = message
	return state
}
