package menu

import "context"

func (menu *Menu) addAndRefresh(ctx context.Context, state state) (state, error) {
	if err := menu.addServer(); err != nil {
		return state, err
	}
	return menu.refreshHosts(ctx, state)
}

func (menu *Menu) removeAndRefresh(ctx context.Context, state state) (state, error) {
	if err := menu.removeServer(state); err != nil {
		return state, err
	}
	return menu.refreshHosts(ctx, state)
}

func (menu *Menu) createAndRefresh(ctx context.Context, state state) (state, error) {
	name, err := menu.createSession(ctx, &state)
	if err != nil {
		return state, err
	}
	state, err = menu.refreshSessions(ctx, state)
	if err != nil || name == "" {
		return state, err
	}
	for index, item := range state.Sessions {
		if item.Name == name {
			state.SessionIdx = index
			break
		}
	}
	if err := menu.connectSession(ctx, &state); err != nil {
		return state, err
	}
	return menu.refreshSessions(ctx, state)
}

func (menu *Menu) deleteAndRefresh(ctx context.Context, state state) (state, error) {
	if err := menu.removeSession(ctx, &state); err != nil {
		return state, err
	}
	return menu.refreshSessions(ctx, state)
}

func (menu *Menu) connectAndRefresh(ctx context.Context, state state) (state, error) {
	if err := menu.connectSession(ctx, &state); err != nil {
		return state, err
	}
	return menu.refreshSessions(ctx, state)
}
