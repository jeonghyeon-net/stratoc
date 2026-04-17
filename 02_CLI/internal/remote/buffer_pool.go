package remote

import "sync"

type bufferPool struct {
	pool sync.Pool
}

var websocketBufferPool = &bufferPool{
	pool: sync.Pool{New: func() any { return make([]byte, readBufferBytes) }},
}

func (pool *bufferPool) Get() any {
	return pool.pool.Get()
}

func (pool *bufferPool) Put(value any) {
	pool.pool.Put(value)
}
