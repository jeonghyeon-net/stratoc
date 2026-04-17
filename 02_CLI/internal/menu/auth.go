package menu

import "github.com/jeonghyeon-net/stratoc/02_CLI/internal/hosts"

func (menu *Menu) authorize(host hosts.Item) (hosts.Item, error) {
	token, err := menu.prompt("인증 토큰", true)
	if err != nil {
		return host, err
	}
	if err := menu.hosts.SaveToken(host.URL, token); err != nil {
		return host, err
	}
	host.Token = token
	return host, nil
}
