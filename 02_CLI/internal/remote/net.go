package remote

import "net"

func tuneSocket(connection *net.TCPConn) {
	_ = connection.SetKeepAlive(true)
	_ = connection.SetKeepAlivePeriod(keepAlivePeriod)
	_ = connection.SetNoDelay(true)
	_ = connection.SetReadBuffer(socketBuffer)
	_ = connection.SetWriteBuffer(socketBuffer)
}

func tuneNetConnection(connection net.Conn) {
	for connection != nil {
		if tcpConnection, ok := connection.(*net.TCPConn); ok {
			tuneSocket(tcpConnection)
			return
		}
		next, ok := connection.(interface{ NetConn() net.Conn })
		if !ok {
			return
		}
		connection = next.NetConn()
	}
}
