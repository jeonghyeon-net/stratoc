package api

import "sync"

type chunk struct {
	data []byte
	size int
}

var chunkPool = sync.Pool{New: func() any {
	return &chunk{data: make([]byte, readBufferBytes)}
}}

func getChunk() *chunk {
	return chunkPool.Get().(*chunk)
}

func putChunk(item *chunk) {
	item.size = 0
	chunkPool.Put(item)
}
