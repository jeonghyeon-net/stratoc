package menu

import "context"

func (menu *Menu) refreshHosts(ctx context.Context, previous state) (state, error) {
	hostsList, err := menu.hosts.List(ctx)
	if err != nil {
		return state{}, err
	}
	next := state{HostError: previous.HostError, HostIndex: previous.HostIndex, Hosts: hostsList, View: previous.View}
	selectHost(&next, previous)
	return next, nil
}

func (menu *Menu) refreshSessions(ctx context.Context, current state) (state, error) {
	host, ok := current.host()
	if !ok {
		current.View = viewServers
		return current, nil
	}
	sessions, status, err := menu.loadSessions(ctx, host)
	if err != nil {
		return state{}, err
	}
	if status == authRequiredText {
		current.clearHostToken()
	}
	current.SessionErr = status
	current.Sessions = sessions
	if current.SessionIdx >= len(current.Sessions) {
		current.SessionIdx = 0
	}
	return current, nil
}
