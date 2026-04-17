package session

import "context"

func (manager *Manager) createName(ctx context.Context, name string) (string, error) {
	if name == "" {
		return manager.nextName(ctx)
	}
	if err := ValidateName(name); err != nil {
		return "", err
	}
	return name, nil
}
