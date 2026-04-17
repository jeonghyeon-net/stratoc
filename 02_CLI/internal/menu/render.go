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
	if len(state.Hosts) == 0 {
		line(menu, hintText("(empty)"))
		renderActions(menu, serverActionItems(state))
		return
	}
	for index, host := range state.Hosts {
		prefix := plainPrefix()
		if index == state.HostIndex {
			prefix = selectedPrefix()
		}
		line(menu, prefix+hostRow(host))
	}
	if state.HostError != "" {
		line(menu, "")
		line(menu, errorText(state.HostError))
	}
	renderActions(menu, serverActionItems(state))
}

func (menu *Menu) renderSessions(state state) {
	host, _ := state.host()
	line(menu, headerText(host.Label))
	if state.SessionErr != "" {
		line(menu, "")
		line(menu, errorText(state.SessionErr))
		renderActions(menu, sessionActionItems(state))
		return
	}
	if len(state.Sessions) == 0 {
		renderActions(menu, sessionActionItems(state))
		return
	}
	line(menu, "")
	for index, item := range state.Sessions {
		prefix := plainPrefix()
		if index == state.SessionIdx {
			prefix = selectedPrefix()
		}
		line(menu, prefix+sessionRow(item))
	}
	renderActions(menu, sessionActionItems(state))
}

func renderActions(menu *Menu, items []string) {
	line(menu, "")
	for _, item := range items {
		line(menu, actionText(item))
	}
}

func line(menu *Menu, value string) {
	fmt.Fprintf(menu.stdout, "\x1b[2K%s\r\n", value)
}

func serverActionItems(state state) []string {
	if len(state.Hosts) == 0 {
		return []string{"r 새로고침", "c 서버 추가", "q 종료"}
	}
	items := []string{"Enter 세션 보기", "r 새로고침", "c 서버 추가"}
	if state.savedHostSelected() {
		items = append(items, "d 서버 제거")
	}
	return append(items, "q 종료")
}

func sessionActionItems(state state) []string {
	if needsAuthorization(state.SessionErr) {
		return []string{"Enter 재인증", "r 새로고침", "← 뒤로", "q 종료"}
	}
	if state.SessionErr != "" {
		return []string{"r 새로고침", "← 뒤로", "q 종료"}
	}
	if len(state.Sessions) == 0 {
		return []string{"c 세션 추가", "r 새로고침", "← 뒤로", "q 종료"}
	}
	return []string{"Enter 연결", "r 새로고침", "c 세션 추가", "d 세션 제거", "← 뒤로", "q 종료"}
}
