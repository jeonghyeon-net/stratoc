package hosts

import "context"

func (manager *Manager) List(ctx context.Context) ([]Item, error) {
	value, err := loadFile()
	if err != nil {
		return nil, err
	}
	items := []Item{}
	for _, item := range value.Servers {
		items = upsert(items, finalize(item, true, value, manager.defaultToken))
	}
	if item, ok := manager.defaultItem(); ok {
		items = upsert(items, finalize(item, false, value, manager.defaultToken))
	}
	discovered, err := discover(ctx, manager.defaultToken)
	if err == nil {
		for _, item := range discovered {
			items = upsert(items, finalize(item, false, value, manager.defaultToken))
		}
	}
	return items, nil
}

func finalize(item Item, saved bool, value fileData, defaultToken string) Item {
	item.URL = normalizeURL(item.URL)
	item.Label = labelFromURL(item.URL)
	item.Saved = saved || item.Saved
	item.Token = tokenFor(item.URL, value, item.Token)
	if item.Token == "" {
		item.Token = defaultToken
	}
	return item
}
