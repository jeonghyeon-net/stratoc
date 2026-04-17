package remote

func (response ErrorResponse) Error() string {
	if response.Message == "" {
		return "request failed"
	}
	return response.Message
}
