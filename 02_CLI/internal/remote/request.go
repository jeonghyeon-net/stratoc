package remote

import (
	"context"
	"io"
	"net/http"
)

func (client *Client) newRequest(
	ctx context.Context,
	method string,
	path string,
	body io.Reader,
) (*http.Request, error) {
	requestURL := *client.baseURL
	requestURL.Path = path
	request, err := http.NewRequestWithContext(ctx, method, requestURL.String(), body)
	if err != nil {
		return nil, err
	}
	if client.authToken != "" {
		request.Header.Set("Authorization", "Bearer "+client.authToken)
	}
	return request, nil
}
