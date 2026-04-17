package menu

import (
	"os"

	"golang.org/x/term"
)

func visibleHosts(menu *Menu, state state, actions []string) []string {
	start, end := visibleRange(len(state.Hosts), state.HostIndex, hostRows(menu, state, actions))
	rows := make([]string, 0, end-start)
	for _, item := range state.Hosts[start:end] {
		rows = append(rows, hostRow(item))
	}
	return rows
}

func visibleSessions(menu *Menu, state state, actions []string) []string {
	start, end := visibleRange(len(state.Sessions), state.SessionIdx, sessionRows(menu, state, actions))
	rows := make([]string, 0, end-start)
	for _, item := range state.Sessions[start:end] {
		rows = append(rows, sessionRow(item))
	}
	return rows
}

func hostOffset(menu *Menu, state state, actions []string) int {
	start, _ := visibleRange(len(state.Hosts), state.HostIndex, hostRows(menu, state, actions))
	return start
}

func sessionOffset(menu *Menu, state state, actions []string) int {
	start, _ := visibleRange(len(state.Sessions), state.SessionIdx, sessionRows(menu, state, actions))
	return start
}

func pageSize(menu *Menu, state state) int {
	if state.View == viewServers {
		return hostRows(menu, state, serverActionItems(state))
	}
	return sessionRows(menu, state, sessionActionItems(state))
}

func visibleRange(total int, selected int, available int) (int, int) {
	if total < 1 {
		return 0, 0
	}
	if available < 1 || available >= total {
		return 0, total
	}
	start := selected - available/2
	if start < 0 {
		start = 0
	}
	end := start + available
	if end > total {
		end = total
		start = end - available
	}
	return start, end
}

func terminalHeight(output *os.File) int {
	_, height, err := term.GetSize(int(output.Fd()))
	if err != nil || height < 1 {
		return 24
	}
	return height
}
