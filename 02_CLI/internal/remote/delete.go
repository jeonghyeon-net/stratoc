package remote

import (
	"context"
	"net/http"
	"net/url"
)

func (client *Client) Delete(ctx context.Context, name string) error {
	request, err := client.newRequest(ctx, http.MethodDelete, "/api/sessions/"+url.PathEscape(name), nil)
	if err != nil {
		return err
	}
	response, err := client.httpClient.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	return expectStatus(response, http.StatusOK)
}
