package com.planme.desktop.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.view.View
import android.widget.RemoteViews
import com.planme.desktop.MainActivity
import com.planme.desktop.R

object PlanMeWidget {

    private val TASK_IDS = intArrayOf(
        R.id.widget_task0, R.id.widget_task1, R.id.widget_task2,
        R.id.widget_task3, R.id.widget_task4, R.id.widget_task5
    )

    fun updateWidget(context: Context, manager: AppWidgetManager, widgetId: Int) {
        val title0    = PlanMeWidgetState.getTitle0(context, widgetId)
        val tasks0    = PlanMeWidgetState.getTasks0(context, widgetId)
        val title1    = PlanMeWidgetState.getTitle1(context, widgetId)
        val tasks1    = PlanMeWidgetState.getTasks1(context, widgetId)
        val activeIdx = PlanMeWidgetState.getActiveIdx(context, widgetId)

        val activeTasks = if (activeIdx == 0) tasks0 else tasks1

        val views = RemoteViews(context.packageName, R.layout.planme_widget)

        // ── 标签栏文字 ────────────────────────────────────────────────
        val displayTitle0 = title0.ifEmpty { "—" }
        val displayTitle1 = title1.ifEmpty { "—" }

        views.setTextViewText(R.id.widget_tab0, displayTitle0)
        views.setTextViewText(R.id.widget_tab1, displayTitle1)

        // 高亮当前选中标签（白色），另一个半透明
        if (activeIdx == 0) {
            views.setTextColor(R.id.widget_tab0, 0xFFFFFFFF.toInt())
            views.setTextColor(R.id.widget_tab1, 0x99FFFFFF.toInt())
        } else {
            views.setTextColor(R.id.widget_tab0, 0x99FFFFFF.toInt())
            views.setTextColor(R.id.widget_tab1, 0xFFFFFFFF.toInt())
        }

        // ── 标签点击：切换显示的文件 ──────────────────────────────────
        views.setOnClickPendingIntent(
            R.id.widget_tab0,
            makeSwitchTabIntent(context, widgetId, 0)
        )
        views.setOnClickPendingIntent(
            R.id.widget_tab1,
            makeSwitchTabIntent(context, widgetId, 1)
        )

        // ── 任务列表 ──────────────────────────────────────────────────
        val openAppIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val openAppPi = PendingIntent.getActivity(
            context, widgetId, openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        if (activeTasks.isEmpty()) {
            views.setViewVisibility(R.id.widget_empty, View.VISIBLE)
            TASK_IDS.forEach { id -> views.setViewVisibility(id, View.GONE) }
        } else {
            views.setViewVisibility(R.id.widget_empty, View.GONE)
            activeTasks.take(6).forEachIndexed { i, taskStr ->
                // 格式："level\ttitle"
                val parts = taskStr.split("\t", limit = 2)
                val level = parts.getOrNull(0)?.toIntOrNull() ?: 1
                val taskTitle = parts.getOrNull(1) ?: taskStr

                views.setViewVisibility(TASK_IDS[i], View.VISIBLE)
                // 按层级显示不同缩进 + bullet
                val label = when (level) {
                    1    -> "▸ $taskTitle"
                    2    -> "  • $taskTitle"
                    else -> "    · $taskTitle"
                }
                // 按层级显示不同亮度
                val color = when (level) {
                    1    -> 0xFFEEEEEE.toInt()   // 亮白
                    2    -> 0xFFCCCCCC.toInt()   // 中灰
                    else -> 0xFFAAAAAA.toInt()   // 暗灰
                }
                views.setTextViewText(TASK_IDS[i], label)
                views.setTextColor(TASK_IDS[i], color)
                views.setOnClickPendingIntent(TASK_IDS[i], openAppPi)
            }
            for (i in activeTasks.size until 6) {
                views.setViewVisibility(TASK_IDS[i], View.GONE)
            }
        }

        manager.updateAppWidget(widgetId, views)
    }

    private fun makeSwitchTabIntent(context: Context, widgetId: Int, tabIdx: Int): PendingIntent {
        val intent = Intent(context, PlanMeWidgetReceiver::class.java).apply {
            action = PlanMeWidgetReceiver.ACTION_SWITCH_TAB
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
            putExtra(PlanMeWidgetReceiver.EXTRA_TAB_IDX, tabIdx)
        }
        // Request code must be unique per (widgetId, tabIdx) to avoid intent collision
        val requestCode = widgetId * 10 + tabIdx
        return PendingIntent.getBroadcast(
            context, requestCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }
}
