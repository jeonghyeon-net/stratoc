package remote

import "errors"

func IsUnauthorized(err error) bool {
	return IsAuthRequired(err) || IsWrongAuthorizationToken(err)
}

func IsAuthRequired(err error) bool {
	return hasMessage(err, "authorization required")
}

func IsWrongAuthorizationToken(err error) bool {
	return hasMessage(err, "wrong authorization token")
}

func hasMessage(err error, message string) bool {
	response := ErrorResponse{}
	return errors.As(err, &response) && response.Message == message
}
