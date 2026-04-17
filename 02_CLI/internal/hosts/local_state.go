package hosts

import (
	"encoding/json"
	"os"
)

type localState struct {
	URL string `json:"url"`
}

func loadLocalState() (localState, error) {
	path := localStatePath()
	data, err := os.ReadFile(path)
	if err != nil {
		return localState{}, err
	}
	value := localState{}
	if err := json.Unmarshal(data, &value); err != nil {
		return localState{}, err
	}
	return value, nil
}
