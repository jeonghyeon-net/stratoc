package hosts

type Item struct {
	Label  string `json:"label"`
	Token  string `json:"token,omitempty"`
	URL    string `json:"url"`
	Saved  bool   `json:"saved"`
	Status string `json:"status,omitempty"`
}

type fileData struct {
	Servers []Item            `json:"servers"`
	Tokens  map[string]string `json:"tokens"`
}

type Manager struct {
	defaultToken string
	defaultURL   string
}
