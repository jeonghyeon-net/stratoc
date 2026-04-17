package menu

import "context"

func (menu *Menu) handle(ctx context.Context, state state, action action) (state, error) {
	switch action.Kind {
	case "refresh":
		return menu.refreshCurrent(ctx, state)
	case "open-host":
		return menu.openHost(ctx, state)
	case "back":
		state.View = viewServers
		return state, nil
	case "add-server":
		return menu.addAndRefresh(ctx, state)
	case "remove-server":
		return menu.removeAndRefresh(ctx, state)
	case "add-session":
		return menu.createAndRefresh(ctx, state)
	case "remove-session":
		return menu.deleteAndRefresh(ctx, state)
	case "connect-session":
		return menu.connectAndRefresh(ctx, state)
	default:
		return state, nil
	}
}

func (menu *Menu) refreshCurrent(ctx context.Context, state state) (state, error) {
	if state.View == viewServers {
		return menu.refreshHosts(ctx, state)
	}
	return menu.refreshSessions(ctx, state)
}
