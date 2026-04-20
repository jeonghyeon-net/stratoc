package com.stratocmobile.terminal.transport

import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString
import java.security.SecureRandom
import java.security.cert.X509Certificate
import java.util.concurrent.TimeUnit
import javax.net.ssl.HostnameVerifier
import javax.net.ssl.SSLContext
import javax.net.ssl.SSLSession
import javax.net.ssl.SSLSocketFactory
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager

class RemoteTerminalSocket(
    private val client: OkHttpClient,
    private val hostUrl: String,
    private val authToken: String,
    private val sessionName: String,
    private val listener: Listener,
) {
    interface Listener {
        fun onOpened()
        fun onText(bytes: ByteArray)
        fun onBinary(bytes: ByteArray)
        fun onDisconnected(message: String, shouldFinish: Boolean, showToast: Boolean)
        fun onFailure(message: String)
    }

    private var socket: WebSocket? = null

    fun connect(columns: Int, rows: Int) {
        if (socket != null) return
        val request = Request.Builder()
            .url(attachUrl(hostUrl, sessionName))
            .header("Authorization", "Bearer $authToken")
            .header("X-Terminal-Columns", columns.toString())
            .header("X-Terminal-Rows", rows.toString())
            .build()
        socket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                listener.onOpened()
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                val control = parseControl(text)
                if (control != null && control.first == "disconnect") {
                    listener.onDisconnected(control.second ?: "disconnected", shouldFinish = false, showToast = true)
                    return
                }
                listener.onText(text.encodeToByteArray())
            }

            override fun onMessage(webSocket: WebSocket, bytes: ByteString) {
                listener.onBinary(bytes.toByteArray())
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                val message = reason.ifBlank {
                    if (code == 1000) "closed" else "connection closed ($code)"
                }
                when {
                    shouldFinishOnSocketClosed(code, message) -> listener.onDisconnected(message, shouldFinish = true, showToast = false)
                    isReplacedConnection(message) -> listener.onDisconnected(message, shouldFinish = true, showToast = true)
                    isBenignDisconnectMessage(message) -> listener.onDisconnected("disconnected", shouldFinish = false, showToast = false)
                    code != 1000 -> listener.onDisconnected(message, shouldFinish = false, showToast = true)
                }
                socket = null
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                listener.onFailure(failureMessage(t, response))
                socket = null
            }
        })
    }

    fun sendInput(bytes: ByteArray) {
        if (bytes.isEmpty()) return
        socket?.send(ByteString.of(*bytes))
    }

    fun sendResize(columns: Int, rows: Int) {
        socket?.send("{\"type\":\"resize\",\"columns\":$columns,\"rows\":$rows}")
    }

    fun close(reason: String) {
        socket?.close(1000, reason)
        socket = null
    }
}

fun attachUrl(hostUrl: String, sessionName: String): String {
    val normalized = if (hostUrl.contains("://")) hostUrl else "https://$hostUrl"
    val url = normalized.toHttpUrlOrNull() ?: throw IllegalArgumentException("invalid host url: $hostUrl")
    val scheme = url.scheme.lowercase()
    require(scheme == "https" || scheme == "wss") { "https required: $hostUrl" }
    val encodedSessionName = java.net.URLEncoder.encode(sessionName, "UTF-8").replace("+", "%20")
    return url.newBuilder()
        .scheme("https")
        .encodedPath("/api/sessions/$encodedSessionName/attach")
        .query(null)
        .fragment(null)
        .build()
        .toString()
}

fun parseControl(value: String): Pair<String, String?>? {
    if (!value.trim().startsWith("{")) return null
    val type = Regex("\"type\"\\s*:\\s*\"([^\"]+)\"").find(value)?.groupValues?.get(1) ?: return null
    val reason = Regex("\"reason\"\\s*:\\s*\"([^\"]*)\"").find(value)?.groupValues?.get(1)
    return type to reason
}

fun failureMessage(error: Throwable, response: Response?): String {
    val payload = response?.body?.string()?.trim().orEmpty()
    if (payload.isNotEmpty()) return payload
    return error.message?.trim().takeUnless { it.isNullOrEmpty() }
        ?: response?.message?.trim().takeUnless { it.isNullOrEmpty() }
        ?: "connection failed"
}

fun isReplacedConnection(message: String): Boolean {
    return message.lowercase().contains("replaced by newer connection")
}

fun shouldFinishOnSocketClosed(code: Int, message: String): Boolean {
    if (code == 1000) return true
    val normalized = message.lowercase()
    return normalized.contains("exited") || normalized.contains("session ended")
}

fun isBenignDisconnectMessage(message: String): Boolean {
    val normalized = message.lowercase()
    return normalized.contains("broken pipe") || normalized.contains("connection reset by peer")
}

fun insecureWebSocketClient(): OkHttpClient {
    val tls = insecureSocketFactory()
    return OkHttpClient.Builder()
        .sslSocketFactory(tls.first, tls.second)
        .hostnameVerifier(object : HostnameVerifier {
            override fun verify(hostname: String?, session: SSLSession?): Boolean = true
        })
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(0, TimeUnit.SECONDS)
        .build()
}

fun insecureSocketFactory(): Pair<SSLSocketFactory, X509TrustManager> {
    val trustManager = object : X509TrustManager {
        override fun checkClientTrusted(chain: Array<out X509Certificate>?, authType: String?) = Unit
        override fun checkServerTrusted(chain: Array<out X509Certificate>?, authType: String?) = Unit
        override fun getAcceptedIssuers(): Array<X509Certificate> = emptyArray()
    }
    val sslContext = SSLContext.getInstance("TLS")
    sslContext.init(null, arrayOf<TrustManager>(trustManager), SecureRandom())
    return sslContext.socketFactory to trustManager
}
