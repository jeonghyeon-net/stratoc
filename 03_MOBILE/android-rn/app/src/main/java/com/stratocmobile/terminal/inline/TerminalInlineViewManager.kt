package com.stratocmobile.terminal.inline

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class TerminalInlineViewManager : SimpleViewManager<InlineTerminalView>() {
    override fun getName(): String = "StratocTerminalInlineView"

    override fun getCommandsMap(): MutableMap<String, Int> {
        return MapBuilder.of(
            "sendSequence", COMMAND_SEND_SEQUENCE,
            "setSoftCtrlArmed", COMMAND_SET_SOFT_CTRL_ARMED,
        )
    }

    override fun createViewInstance(reactContext: ThemedReactContext): InlineTerminalView {
        return InlineTerminalView(reactContext)
    }

    @ReactProp(name = "hostUrl")
    fun setHostUrl(view: InlineTerminalView, value: String?) {
        view.setHostUrl(value.orEmpty())
    }

    @ReactProp(name = "authToken")
    fun setAuthToken(view: InlineTerminalView, value: String?) {
        view.setAuthToken(value.orEmpty())
    }

    @ReactProp(name = "sessionName")
    fun setSessionName(view: InlineTerminalView, value: String?) {
        view.setSessionName(value.orEmpty())
    }

    @ReactProp(name = "fontScale", defaultFloat = 1f)
    fun setFontScale(view: InlineTerminalView, value: Float) {
        view.setFontScale(value)
    }

    override fun receiveCommand(view: InlineTerminalView, commandId: Int, args: ReadableArray?) {
        when (commandId) {
            COMMAND_SEND_SEQUENCE -> view.sendSequence(args?.getString(0).orEmpty())
            COMMAND_SET_SOFT_CTRL_ARMED -> view.setSoftCtrlArmed(args?.getBoolean(0) == true)
        }
    }

    companion object {
        private const val COMMAND_SEND_SEQUENCE = 1
        private const val COMMAND_SET_SOFT_CTRL_ARMED = 2
    }
}
