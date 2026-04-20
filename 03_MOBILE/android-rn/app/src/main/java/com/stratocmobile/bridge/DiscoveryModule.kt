package com.stratocmobile.bridge

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.net.wifi.WifiManager
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.concurrent.atomic.AtomicBoolean

class DiscoveryModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "DiscoveryModule"

    @ReactMethod
    fun discoverHosts(promise: Promise) {
        val nsdManager = reactApplicationContext.getSystemService(Context.NSD_SERVICE) as? NsdManager
        if (nsdManager == null) {
            promise.resolve(Arguments.createArray())
            return
        }
        val wifiManager = reactApplicationContext.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
        val multicastLock = wifiManager?.createMulticastLock("stratoc-discovery")?.apply {
            setReferenceCounted(false)
            runCatching { acquire() }
        }
        val resolved = linkedMapOf<String, Pair<String, String>>()
        val handler = Handler(Looper.getMainLooper())
        val finished = AtomicBoolean(false)
        lateinit var listener: NsdManager.DiscoveryListener

        fun finish() {
            if (!finished.compareAndSet(false, true)) {
                return
            }
            runCatching { nsdManager.stopServiceDiscovery(listener) }
            multicastLock?.let { runCatching { if (it.isHeld) it.release() } }
            val array = Arguments.createArray()
            for ((url, item) in resolved) {
                val map = Arguments.createMap().apply {
                    putString("url", url)
                    putString("label", item.first)
                }
                array.pushMap(map)
            }
            promise.resolve(array)
        }

        listener = object : NsdManager.DiscoveryListener {
            override fun onStartDiscoveryFailed(serviceType: String?, errorCode: Int) = finish()
            override fun onStopDiscoveryFailed(serviceType: String?, errorCode: Int) = finish()
            override fun onDiscoveryStarted(serviceType: String?) = Unit
            override fun onDiscoveryStopped(serviceType: String?) = Unit

            override fun onServiceFound(serviceInfo: NsdServiceInfo) {
                if (serviceInfo.serviceType != "_stratoc._tcp.") {
                    return
                }
                nsdManager.resolveService(serviceInfo, object : NsdManager.ResolveListener {
                    override fun onResolveFailed(serviceInfo: NsdServiceInfo?, errorCode: Int) = Unit

                    override fun onServiceResolved(serviceInfo: NsdServiceInfo) {
                        val host = serviceInfo.host?.hostAddress ?: serviceInfo.host?.hostName ?: return
                        val url = "https://$host:${serviceInfo.port}"
                        resolved[url] = "# $host" to url
                    }
                })
            }

            override fun onServiceLost(serviceInfo: NsdServiceInfo) = Unit
        }

        handler.post {
            runCatching {
                nsdManager.discoverServices("_stratoc._tcp.", NsdManager.PROTOCOL_DNS_SD, listener)
                handler.postDelayed({ finish() }, 400)
            }.onFailure {
                multicastLock?.let { lock -> runCatching { if (lock.isHeld) lock.release() } }
                promise.resolve(Arguments.createArray())
            }
        }
    }
}
