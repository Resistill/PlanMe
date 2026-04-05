package com.planme.desktop.widget

import android.content.Context

object PlanMeWidgetState {
    private const val PREFS = "planme_widget_state"

    fun saveWidgetData(
        context: Context,
        widgetId: Int,
        title0: String,
        tasks0: List<String>,
        title1: String,
        tasks1: List<String>
    ) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().apply {
            putString("title0_$widgetId", title0)
            putString("tasks0_$widgetId", tasks0.joinToString("\n"))
            putString("title1_$widgetId", title1)
            putString("tasks1_$widgetId", tasks1.joinToString("\n"))
            apply()
        }
    }

    fun getTitle0(context: Context, widgetId: Int): String =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString("title0_$widgetId", "") ?: ""

    fun getTasks0(context: Context, widgetId: Int): List<String> =
        (context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString("tasks0_$widgetId", "") ?: "")
            .split("\n").filter { it.isNotBlank() }

    fun getTitle1(context: Context, widgetId: Int): String =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString("title1_$widgetId", "") ?: ""

    fun getTasks1(context: Context, widgetId: Int): List<String> =
        (context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString("tasks1_$widgetId", "") ?: "")
            .split("\n").filter { it.isNotBlank() }

    fun getActiveIdx(context: Context, widgetId: Int): Int =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getInt("active_$widgetId", 0)

    fun setActiveIdx(context: Context, widgetId: Int, idx: Int) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putInt("active_$widgetId", idx)
            .apply()
    }

    fun removeWidget(context: Context, widgetId: Int) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().apply {
            remove("title0_$widgetId")
            remove("tasks0_$widgetId")
            remove("title1_$widgetId")
            remove("tasks1_$widgetId")
            remove("active_$widgetId")
            apply()
        }
    }
}
