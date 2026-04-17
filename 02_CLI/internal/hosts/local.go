package hosts

func localDefaultURL() string {
	value, err := loadLocalState()
	if err != nil {
		return ""
	}
	return normalizeURL(value.URL)
}

func (manager *Manager) defaultItem() (Item, bool) {
	url := manager.defaultURL
	if url == "" {
		url = localDefaultURL()
	}
	if url == "" {
		return Item{}, false
	}
	return Item{URL: url, Status: "로컬"}, true
}
