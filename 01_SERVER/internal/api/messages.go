package api

type message struct {
	Type    string `json:"type"`
	Reason  string `json:"reason,omitempty"`
	Columns uint16 `json:"columns,omitempty"`
	Rows    uint16 `json:"rows,omitempty"`
}
