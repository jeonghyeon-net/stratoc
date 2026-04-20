package com.stratocmobile.bridge

import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class SecureStorageModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val preferences by lazy {
        val masterKey = MasterKey.Builder(reactApplicationContext)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        EncryptedSharedPreferences.create(
            reactApplicationContext,
            "stratoc.secure-storage",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }

    override fun getName(): String = "SecureStorageModule"

    @ReactMethod
    fun getItem(key: String, promise: Promise) {
        promise.resolve(preferences.getString(key, null))
    }

    @ReactMethod
    fun setItem(key: String, value: String, promise: Promise) {
        preferences.edit().putString(key, value).apply()
        promise.resolve(null)
    }

    @ReactMethod
    fun removeItem(key: String, promise: Promise) {
        preferences.edit().remove(key).apply()
        promise.resolve(null)
    }
}
