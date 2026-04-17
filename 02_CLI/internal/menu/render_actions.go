package menu

func renderActions(menu *Menu, items []string) {
	line(menu, "")
	for _, item := range items {
		line(menu, actionText(item))
	}
}

func serverActionItems(state state) []string {
	if len(state.Hosts) == 0 {
		return []string{"r 새로고침", "c 서버 추가", "q 종료"}
	}
	items := []string{"Enter 세션 보기", "r 새로고침", "c 서버 추가", "PgUp/PgDn 이동"}
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
	return []string{"Enter 연결", "r 새로고침", "c 세션 추가", "d 세션 제거", "PgUp/PgDn 이동", "← 뒤로", "q 종료"}
}
