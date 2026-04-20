package com.stratocmobile.bridge

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.security.SecureRandom
import java.security.cert.X509Certificate
import java.util.concurrent.TimeUnit
import javax.net.ssl.HostnameVerifier
import javax.net.ssl.SSLContext
import javax.net.ssl.SSLSession
import javax.net.ssl.SSLSocketFactory
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager

class ApiModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val client: OkHttpClient = insecureClient()

    override fun getName(): String = "ApiModule"

    @ReactMethod
    fun request(payload: com.facebook.react.bridge.ReadableMap, promise: Promise) {
        try {
            val baseUrl = payload.getString("baseUrl") ?: throw IllegalArgumentException("baseUrl missing")
            val path = payload.getString("path") ?: throw IllegalArgumentException("path missing")
            val method = payload.getString("method") ?: throw IllegalArgumentException("method missing")
            val token = if (payload.hasKey("token") && !payload.isNull("token")) payload.getString("token") else null
            val body = if (payload.hasKey("body") && !payload.isNull("body")) payload.getString("body") else null
            val request = requestBuilder(baseUrl, path, method, token, body).build()

            Thread {
                runCatching { client.newCall(request).execute() }
                    .onSuccess { response ->
                        response.use {
                            val result = Arguments.createMap().apply {
                                putInt("status", response.code)
                                putString("body", response.body?.string() ?: "")
                            }
                            promise.resolve(result)
                        }
                    }
                    .onFailure { error ->
                        promise.reject("request_failed", error.message, error)
                    }
            }.start()
        } catch (error: Throwable) {
            promise.reject("request_invalid", error.message, error)
        }
    }

    private fun requestBuilder(baseUrl: String, path: String, method: String, token: String?, body: String?): Request.Builder {
        val url = normalizeBaseUrl(baseUrl).newBuilder().encodedPath(path).build()
        val builder = Request.Builder().url(url)
        if (!token.isNullOrBlank()) {
            builder.header("Authorization", "Bearer $token")
        }
        if (body != null) {
            builder.header("Content-Type", "application/json")
        }
        val requestBody = body?.toRequestBody("application/json; charset=utf-8".toMediaType())
        when (method) {
            "GET" -> builder.get()
            "POST" -> builder.post(requestBody ?: ByteArray(0).toRequestBody())
            "DELETE" -> if (requestBody == null) builder.delete() else builder.delete(requestBody)
            else -> throw IllegalArgumentException("unsupported method: $method")
        }
        return builder
    }

    private fun normalizeBaseUrl(value: String): okhttp3.HttpUrl {
        val candidate = value.trim().let { if (it.contains("://")) it else "https://$it" }
        val url = candidate.toHttpUrlOrNull() ?: throw IllegalArgumentException("invalid base url: $value")
        require(url.scheme == "https") { "https required: $candidate" }
        return url.newBuilder().encodedPath("/").query(null).fragment(null).build()
    }
}

private fun insecureClient(): OkHttpClient {
    val trustManager = object : X509TrustManager {
        override fun checkClientTrusted(chain: Array<out X509Certificate>?, authType: String?) = Unit
        override fun checkServerTrusted(chain: Array<out X509Certificate>?, authType: String?) = Unit
        override fun getAcceptedIssuers(): Array<X509Certificate> = emptyArray()
    }
    val sslContext = SSLContext.getInstance("TLS")
    sslContext.init(null, arrayOf<TrustManager>(trustManager), SecureRandom())
    val socketFactory: SSLSocketFactory = sslContext.socketFactory
    return OkHttpClient.Builder()
        .sslSocketFactory(socketFactory, trustManager)
        .hostnameVerifier(object : HostnameVerifier {
            override fun verify(hostname: String?, session: SSLSession?): Boolean = true
        })
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(5, TimeUnit.SECONDS)
        .writeTimeout(5, TimeUnit.SECONDS)
        .build()
}
