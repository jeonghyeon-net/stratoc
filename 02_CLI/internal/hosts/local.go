package hosts

func (manager *Manager) defaultItem() (Item, bool) {
	url := manager.defaultURL
	if url == "" {
		return Item{}, false
	}
	return Item{URL: url, Status: "수동 기본값"}, true
}
