package hosts

import (
	"encoding/json"
	"os"
)

func loadFile() (fileData, error) {
	path := storePath()
	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return fileData{}, nil
	}
	if err != nil {
		return fileData{}, err
	}
	value := fileData{}
	if err := json.Unmarshal(data, &value); err != nil {
		return fileData{}, err
	}
	return value, nil
}
