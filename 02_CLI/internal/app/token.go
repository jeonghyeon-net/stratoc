package app

import (
	"crypto/rand"
	"encoding/hex"
)

func defaultAuthorizationToken() string {
	buffer := make([]byte, 32)
	if _, err := rand.Read(buffer); err != nil {
		return "development-token"
	}
	return hex.EncodeToString(buffer)
}
