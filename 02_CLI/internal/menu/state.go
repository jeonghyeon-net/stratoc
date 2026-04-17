package menu

import "github.com/jeonghyeon-net/stratoc/02_CLI/internal/hosts"

func selectHost(next *state, previous state) {
	if len(next.Hosts) == 0 {
		return
	}
	if previous.HostIndex >= 0 && previous.HostIndex < len(previous.Hosts) {
		selected := previous.Hosts[previous.HostIndex].URL
		for index, item := range next.Hosts {
			if item.URL == selected {
				next.HostIndex = index
				return
			}
		}
	}
	if previous.HostIndex < len(next.Hosts) {
		next.HostIndex = previous.HostIndex
	}
}

func selectSession(next *state, previous state) {
	if previous.SessionIdx < len(next.Sessions) {
		next.SessionIdx = previous.SessionIdx
	}
}

func (state state) host() (hosts.Item, bool) {
	if len(state.Hosts) == 0 || state.HostIndex >= len(state.Hosts) {
		return hosts.Item{}, false
	}
	return state.Hosts[state.HostIndex], true
}

func (state state) savedHostSelected() bool {
	host, ok := state.host()
	return ok && host.Saved
}

func (state *state) setHost(host hosts.Item) {
	if state.HostIndex >= 0 && state.HostIndex < len(state.Hosts) {
		state.Hosts[state.HostIndex] = host
	}
}

func (state *state) clearHostToken() {
	host, ok := state.host()
	if !ok {
		return
	}
	host.Token = ""
	state.setHost(host)
}
