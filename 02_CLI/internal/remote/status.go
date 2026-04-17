package remote

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

func expectStatus(response *http.Response, expectedStatusCode int) error {
	if response.StatusCode == expectedStatusCode {
		return nil
	}
	body, _ := io.ReadAll(io.LimitReader(response.Body, 16*1024))
	errorResponse := ErrorResponse{}
	if err := json.Unmarshal(body, &errorResponse); err == nil && errorResponse.Message != "" {
		return errorResponse
	}
	if len(body) == 0 {
		return fmt.Errorf("unexpected status: %s", response.Status)
	}
	return fmt.Errorf("unexpected status: %s: %s", response.Status, strings.TrimSpace(string(body)))
}
