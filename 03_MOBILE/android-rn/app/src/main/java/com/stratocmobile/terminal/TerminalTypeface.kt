package com.stratocmobile.terminal

import android.content.Context
import android.graphics.Typeface

object TerminalTypeface {
    @Volatile
    private var cached: Typeface? = null

    @JvmStatic
    fun terminal(context: Context): Typeface {
        cached?.let { return it }
        return synchronized(this) {
            cached?.let { return@synchronized it }
            val resolved = runCatching {
                Typeface.createFromAsset(context.applicationContext.assets, "fonts/D2Coding.ttf")
            }.getOrElse {
                Typeface.MONOSPACE
            }
            cached = resolved
            resolved
        }
    }
}
