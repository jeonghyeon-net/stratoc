package menu

import (
	"fmt"
	"io"

	"golang.org/x/term"
)

var errInterrupted = io.EOF

func (menu *Menu) enterDashboard() error {
	if menu.rawState != nil {
		return nil
	}
	state, err := term.MakeRaw(int(menu.stdin.Fd()))
	if err != nil {
		return err
	}
	menu.rawState = state
	fmt.Fprint(menu.stdout, "\x1b[?1049h\x1b[2J\x1b[3J\x1b[H\x1b[?25l")
	return nil
}

func (menu *Menu) leaveDashboard() {
	if menu.rawState == nil {
		return
	}
	_ = term.Restore(int(menu.stdin.Fd()), menu.rawState)
	menu.rawState = nil
	fmt.Fprint(menu.stdout, "\x1b[?25h\x1b[?1049l")
}

func (menu *Menu) pauseRaw() error {
	if menu.rawState == nil {
		return nil
	}
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
	return nil
}
