package api

import "os"

func pumpTerminal(terminal *os.File, chunks chan<- *chunk, result chan<- error) {
	defer close(chunks)
	for {
		item := getChunk()
		count, err := terminal.Read(item.data)
		if count > 0 {
			item.size = count
			chunks <- item
		} else {
			putChunk(item)
		}
		if err != nil {
			result <- err
			return
		}
	}
}
