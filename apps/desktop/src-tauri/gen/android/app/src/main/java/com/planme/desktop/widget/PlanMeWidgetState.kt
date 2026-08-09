package com.planme.desktop.widget

import android.content.Context

/**
 * 小组件的持久化状态。
 *
 * 文件内容（标题 + 全部行）对所有小组件实例都是同一份，因此用全局 key 存储；
 * 只有"当前显示哪个标签页"是每个 widgetId 独立的。
 */
object PlanMeWidgetState {
    private const val PREFS = "planme_widget_state"

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun saveWidgetData(
        context: Context,
        title0: String,
        lines0: List<WidgetLine>,
        title1: String,
        lines1: List<WidgetLine>
    ) {
        prefs(context).edit().apply {
            putString("title0", title0)
            putString("lines0", WidgetTaskParser.encode(lines0).joinToString("\n"))
            putString("title1", title1)
            putString("lines1", WidgetTaskParser.encode(lines1).joinToString("\n"))
            apply()
        }
    }

    fun getTitle(context: Context, idx: Int): String =
        prefs(context).getString(if (idx == 0) "title0" else "title1", "") ?: ""

    fun getLines(context: Context, idx: Int): List<WidgetLine> {
        val raw = prefs(context).getString(if (idx == 0) "lines0" else "lines1", "") ?: ""
        if (raw.isEmpty()) return emptyList()
        return WidgetTaskParser.decode(raw.split("\n").filter { it.isNotBlank() })
    }

    fun getActiveIdx(context: Context, widgetId: Int): Int =
        prefs(context).getInt("active_$widgetId", 0)

    fun setActiveIdx(context: Context, widgetId: Int, idx: Int) {
        prefs(context).edit().putInt("active_$widgetId", idx).apply()
    }

    fun removeWidget(context: Context, widgetId: Int) {
        prefs(context).edit().remove("active_$widgetId").apply()
    }
}
