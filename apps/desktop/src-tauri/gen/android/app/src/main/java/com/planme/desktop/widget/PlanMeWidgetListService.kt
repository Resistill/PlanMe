package com.planme.desktop.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.text.SpannableString
import android.text.Spanned
import android.text.style.StrikethroughSpan
import android.util.TypedValue
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import com.planme.desktop.R

/** 为小组件的 ListView 提供数据（每个 widgetId 一个 factory） */
class PlanMeWidgetListService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory =
        PlanMeWidgetListFactory(
            applicationContext,
            intent.getIntExtra(
                AppWidgetManager.EXTRA_APPWIDGET_ID,
                AppWidgetManager.INVALID_APPWIDGET_ID
            )
        )
}

private class PlanMeWidgetListFactory(
    private val context: Context,
    private val widgetId: Int
) : RemoteViewsService.RemoteViewsFactory {

    private var lines: List<WidgetLine> = emptyList()

    override fun onCreate() = Unit

    override fun onDataSetChanged() {
        val idx = PlanMeWidgetState.getActiveIdx(context, widgetId)
        lines = PlanMeWidgetState.getLines(context, idx)
    }

    override fun onDestroy() {
        lines = emptyList()
    }

    override fun getCount(): Int = lines.size

    override fun getViewAt(position: Int): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.planme_widget_item)
        val line = lines.getOrNull(position) ?: return views

        val label = bullet(line.level) + line.text
        val text: CharSequence = if (line.completed) {
            SpannableString(label).apply {
                setSpan(StrikethroughSpan(), 0, length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
            }
        } else {
            label
        }

        views.setTextViewText(R.id.widget_item_text, text)
        views.setTextColor(R.id.widget_item_text, colorFor(line))
        views.setTextViewTextSize(
            R.id.widget_item_text, TypedValue.COMPLEX_UNIT_SP, sizeFor(line.level)
        )
        views.setViewPadding(R.id.widget_item_text, indentPx(line.level), 0, 0, dp(2))
        // 点击任意一行打开 App（配合 setPendingIntentTemplate）
        views.setOnClickFillInIntent(R.id.widget_item_text, Intent())
        return views
    }

    override fun getLoadingView(): RemoteViews? = null

    override fun getViewTypeCount(): Int = 1

    override fun getItemId(position: Int): Long = position.toLong()

    override fun hasStableIds(): Boolean = true

    // ── 渲染规则 ────────────────────────────────────────────────────────

    private fun bullet(level: Int) = when (level) {
        0 -> ""       // 正文行不加符号
        1 -> "▸ "
        2 -> "• "
        else -> "· "
    }

    private fun colorFor(line: WidgetLine): Int {
        if (line.completed) return 0xFF777777.toInt()
        return when (line.level) {
            1 -> 0xFFFFFFFF.toInt()
            2 -> 0xFFDDDDDD.toInt()
            3 -> 0xFFBBBBBB.toInt()
            else -> 0xFFAAAAAA.toInt()   // 正文
        }
    }

    private fun sizeFor(level: Int) = when (level) {
        1 -> 16f
        2 -> 15f
        else -> 13f
    }

    /** 标题按层级缩进，正文跟随上一级标题再退一格 */
    private fun indentPx(level: Int) = dp(
        when (level) {
            0 -> 20      // 正文
            1 -> 0
            2 -> 10
            else -> 20
        }
    )

    private fun dp(value: Int): Int =
        (value * context.resources.displayMetrics.density).toInt()
}
