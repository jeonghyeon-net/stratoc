package menu

import "fmt"

func (menu *Menu) render(state state) {
	fmt.Fprint(menu.stdout, "\x1b[2J\x1b[3J\x1b[H")
	if state.View == viewServers {
		menu.renderServers(state)
		return
	}
	menu.renderSessions(state)
}

func (menu *Menu) renderServers(state state) {
	actions := serverActionItems(state)
	if len(state.Hosts) == 0 {
		line(menu, hintText("(empty)"))
		renderActions(menu, actions)
		return
	}
	for index, host := range visibleHosts(menu, state, actions) {
		line(menu, hostLine(host, index+hostOffset(menu, state, actions), state.HostIndex))
	}
	if state.HostError != "" {
		line(menu, "")
		line(menu, errorText(state.HostError))
	}
	renderActions(menu, actions)
}

func (menu *Menu) renderSessions(state state) {
	actions := sessionActionItems(state)
	host, _ := state.host()
	line(menu, headerText(host.Label))
	if state.SessionErr != "" {
		line(menu, "")
		line(menu, errorText(state.SessionErr))
		renderActions(menu, actions)
		return
	}
	if len(state.Sessions) == 0 {
		renderActions(menu, actions)
		return
	}
	line(menu, "")
	for index, item := range visibleSessions(menu, state, actions) {
		line(menu, sessionLine(item, index+sessionOffset(menu, state, actions), state.SessionIdx))
	}
	renderActions(menu, actions)
}

func hostLine(host string, index int, selected int) string {
	if index == selected {
		return selectedPrefix() + host
	}
	return plainPrefix() + host
}

func sessionLine(item string, index int, selected int) string {
	if index == selected {
		return selectedPrefix() + item
	}
	return plainPrefix() + item
}

func line(menu *Menu, value string) {
	fmt.Fprintf(menu.stdout, "\x1b[2K%s\r\n", value)
}
