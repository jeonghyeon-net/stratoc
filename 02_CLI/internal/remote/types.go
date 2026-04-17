package remote

import (
	"net/http"
	"net/url"
)

type Session struct {
	Name      string `json:"name"`
	Title     string `json:"title,omitempty"`
	Attached  int    `json:"attached"`
	Windows   int    `json:"windows"`
	CreatedAt string `json:"created_at"`
}

type CreateRequest struct {
	Name             string `json:"name"`
	WorkingDirectory string `json:"working_directory,omitempty"`
	ShellPath        string `json:"shell_path,omitempty"`
}

type ErrorResponse struct {
	Message string `json:"error"`
}

type Client struct {
	baseURL    *url.URL
	authToken  string
	httpClient *http.Client
}
