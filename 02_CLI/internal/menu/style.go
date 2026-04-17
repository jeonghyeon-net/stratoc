package menu

import "strings"

const (
	resetCode  = "\x1b[0m"
	boldCode   = "\x1b[1m"
	dimCode    = "\x1b[2m"
	redCode    = "\x1b[31m"
	greenCode  = "\x1b[32m"
	blueCode   = "\x1b[36m"
	yellowCode = "\x1b[33m"
)

func style(code string, value string) string {
	if value == "" {
		return ""
	}
	return code + value + resetCode
}

func actionText(value string) string {
	parts := strings.SplitN(value, " ", 2)
	if len(parts) == 1 {
		return style(greenCode, parts[0])
	}
	return style(greenCode, parts[0]) + " " + style(dimCode, parts[1])
}

func errorText(value string) string  { return style(redCode, value) }
func headerText(value string) string { return style(boldCode+blueCode, value) }
func hintText(value string) string   { return style(dimCode, value) }
func statusText(value string) string { return style(yellowCode, value) }
func selectedPrefix() string         { return style(yellowCode, ">") + " " }
func plainPrefix() string            { return "  " }
