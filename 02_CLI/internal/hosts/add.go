package hosts

func (manager *Manager) Add(rawURL string, token string) error {
	value, err := loadFile()
	if err != nil {
		return err
	}
	url := normalizeURL(rawURL)
	if value.Tokens == nil {
		value.Tokens = map[string]string{}
	}
	if token != "" {
		value.Tokens[url] = token
	}
	value.Servers = upsert(value.Servers, Item{Label: labelFromURL(url), URL: url, Saved: true})
	return saveFile(value)
}
