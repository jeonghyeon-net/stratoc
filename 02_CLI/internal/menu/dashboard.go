package menu

import (
	"fmt"
	"io"

	"golang.org/x/term"
)

var errInterrupted = io.EOF

const (
	enterDashboardScreen  = "\x1b[?1049h\x1b[2J\x1b[3J\x1b[H\x1b[?25l\x1b[?1000h\x1b[?1006h"
	leaveDashboardScreen  = "\x1b[?1006l\x1b[?1000l\x1b[?25h\x1b[?1049l"
	enableDashboardMouse  = "\x1b[?1000h\x1b[?1006h"
	disableDashboardMouse = "\x1b[?1006l\x1b[?1000l"
)

func (menu *Menu) enterDashboard() error {
	if menu.rawState != nil {
		return nil
	}
	state, err := term.MakeRaw(int(menu.stdin.Fd()))
	if err != nil {
		return err
	}
	menu.rawState = state
	fmt.Fprint(menu.stdout, enterDashboardScreen)
	return nil
}

func (menu *Menu) leaveDashboard() {
	if menu.rawState == nil {
		return
	}
	_ = term.Restore(int(menu.stdin.Fd()), menu.rawState)
	menu.rawState = nil
	fmt.Fprint(menu.stdout, leaveDashboardScreen)
}

func (menu *Menu) pauseRaw() error {
	if menu.rawState == nil {
		return nil
	}
	fmt.Fprint(menu.stdout, disableDashboardMouse)
	return term.Restore(int(menu.stdin.Fd()), menu.rawState)
}

func (menu *Menu) resumeRaw() error {
	if menu.rawState == nil {
		return nil
	}
	state, err := term.MakeRaw(int(menu.stdin.Fd()))
	if err != nil {
		return err
	}
	menu.rawState = state
	fmt.Fprint(menu.stdout, enableDashboardMouse)
	return nil
}
