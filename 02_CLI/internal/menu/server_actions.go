package menu

func (menu *Menu) addServer() error {
	url, err := menu.prompt("서버 주소", true)
	if err != nil {
		return err
	}
	token, err := menu.prompt("인증 토큰 (비우면 캐시 없음)", false)
	if err != nil {
		return err
	}
	return menu.hosts.Add(url, token)
}

func (menu *Menu) removeServer(state state) error {
	host, ok := state.host()
	if !ok || !host.Saved {
		return nil
	}
	return menu.hosts.Remove(host.URL)
}
