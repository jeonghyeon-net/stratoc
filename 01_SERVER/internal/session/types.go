package session

import (
	"errors"
	"time"
)

var (
	ErrInvalidName = errors.New("invalid session name")
	ErrExists      = errors.New("session already exists")
	ErrNotFound    = errors.New("session not found")
)

type Item struct {
	Name      string    `json:"name"`
	Title     string    `json:"title,omitempty"`
	Attached  int       `json:"attached"`
	Windows   int       `json:"windows"`
	CreatedAt time.Time `json:"created_at"`
}

type CreateRequest struct {
	Name             string `json:"name"`
	WorkingDirectory string `json:"working_directory,omitempty"`
	ShellPath        string `json:"shell_path,omitempty"`
}
