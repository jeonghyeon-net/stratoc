package app

import (
	"bufio"
	"os"
	"path/filepath"
	"strings"
)

func loadDotEnv() map[string]string {
	path, ok := findDotEnv()
	if !ok {
		return map[string]string{}
	}
	_, values := readDotEnv(path)
	return values
}

func findDotEnv() (string, bool) {
	directory, err := os.Getwd()
	if err != nil {
		return "", false
	}
	for {
		path := filepath.Join(directory, ".env")
		if _, err := os.Stat(path); err == nil {
			return path, true
		}
		if _, err := os.Stat(filepath.Join(directory, ".mise.toml")); err == nil {
			return path, false
		}
		parent := filepath.Dir(directory)
		if parent == directory {
			return path, false
		}
		directory = parent
	}
}

func readDotEnv(path string) ([]string, map[string]string) {
	file, err := os.Open(path)
	if err != nil {
		return nil, map[string]string{}
	}
	defer file.Close()
	lines, values := []string{}, map[string]string{}
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		lines = append(lines, line)
		if key, value, ok := parseDotEnvLine(line); ok {
			values[key] = value
		}
	}
	return lines, values
}

func parseDotEnvLine(line string) (string, string, bool) {
	text := strings.TrimSpace(line)
	if text == "" || strings.HasPrefix(text, "#") || !strings.Contains(text, "=") {
		return "", "", false
	}
	parts := strings.SplitN(text, "=", 2)
	return strings.TrimSpace(parts[0]), strings.TrimSpace(parts[1]), true
}
