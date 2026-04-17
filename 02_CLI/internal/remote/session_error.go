package remote

import "errors"

func IsInvalidSessionName(err error) bool {
	response := ErrorResponse{}
	return errors.As(err, &response) && response.Message == "invalid session name: \"\""
}
