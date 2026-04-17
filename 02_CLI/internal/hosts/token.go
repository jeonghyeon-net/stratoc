package hosts

func (manager *Manager) SaveToken(rawURL string, token string) error {
	value, err := loadFile()
	if err != nil {
		return err
	}
	if value.Tokens == nil {
		value.Tokens = map[string]string{}
	}
	value.Tokens[normalizeURL(rawURL)] = token
	return saveFile(value)
}

func (manager *Manager) ClearToken(rawURL string) error {
	value, err := loadFile()
	if err != nil {
		return err
	}
	delete(value.Tokens, normalizeURL(rawURL))
	return saveFile(value)
}

func (manager *Manager) HasToken(rawURL string) bool {
	value, err := loadFile()
	if err != nil {
		return false
	}
	_, ok := value.Tokens[normalizeURL(rawURL)]
	return ok
}

func tokenFor(rawURL string, value fileData, fallback string) string {
	if token, ok := value.Tokens[normalizeURL(rawURL)]; ok && token != "" {
		return token
	}
	return fallback
}
