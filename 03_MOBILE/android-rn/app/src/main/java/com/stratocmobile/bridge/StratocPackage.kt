package com.stratocmobile.bridge

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.stratocmobile.terminal.inline.TerminalInlineViewManager

class StratocPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> = listOf(
        SecureStorageModule(reactContext),
        ApiModule(reactContext),
        DiscoveryModule(reactContext),
        TerminalModule(reactContext),
    )

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> = listOf(
        TerminalInlineViewManager(),
    )
}
