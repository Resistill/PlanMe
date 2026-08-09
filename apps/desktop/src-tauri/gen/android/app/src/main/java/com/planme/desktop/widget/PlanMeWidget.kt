package com.planme.desktop.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import com.planme.desktop.MainActivity
import com.planme.desktop.R

object PlanMeWidget {

    fun updateWidget(context: Context, manager: AppWidgetManager, widgetId: Int) {
        val activeIdx = PlanMeWidgetState.getActiveIdx(context, widgetId)
        val views = RemoteViews(context.packageName, R.layout.planme_widget)

        // ── 标签栏 ────────────────────────────────────────────────────
        views.setTextViewText(
            R.id.widget_tab0,
            PlanMeWidgetState.getTitle(context, 0).ifEmpty { "—" }
        )
        views.setTextViewText(
            R.id.widget_tab1,
            PlanMeWidgetState.getTitle(context, 1).ifEmpty { "—" }
        )

        // 高亮当前选中标签（白色），另一个半透明
        if (activeIdx == 0) {
            views.setTextColor(R.id.widget_tab0, 0xFFFFFFFF.toInt())
            views.setTextColor(R.id.widget_tab1, 0x99FFFFFF.toInt())
        } else {
            views.setTextColor(R.id.widget_tab0, 0x99FFFFFF.toInt())
            views.setTextColor(R.id.widget_tab1, 0xFFFFFFFF.toInt())
        }

        views.setOnClickPendingIntent(R.id.widget_tab0, switchTabIntent(context, widgetId, 0))
        views.setOnClickPendingIntent(R.id.widget_tab1, switchTabIntent(context, widgetId, 1))
        views.setOnClickPendingIntent(R.id.widget_refresh, refreshIntent(context, widgetId))

        // ── 内容列表 ──────────────────────────────────────────────────
        val serviceIntent = Intent(context, PlanMeWidgetListService::class.java).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
            // 每个 widgetId 必须有唯一的 data URI，否则多个小组件会共用同一个 factory
            data = Uri.parse(toUri(Intent.URI_INTENT_SCHEME))
        }
        views.setRemoteAdapter(R.id.widget_list, serviceIntent)
        views.setEmptyView(R.id.widget_list, R.id.widget_empty)

        // 点击列表任意一行打开 App
        val openApp = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        views.setPendingIntentTemplate(
            R.id.widget_list,
            PendingIntent.getActivity(
                context, widgetId, openApp,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        )

        manager.updateAppWidget(widgetId, views)
    }

    private fun switchTabIntent(context: Context, widgetId: Int, tabIdx: Int): PendingIntent =
        broadcast(
            context,
            widgetId,
            requestCode = widgetId * 10 + tabIdx,
            action = PlanMeWidgetReceiver.ACTION_SWITCH_TAB,
        ) { it.putExtra(PlanMeWidgetReceiver.EXTRA_TAB_IDX, tabIdx) }

    private fun refreshIntent(context: Context, widgetId: Int): PendingIntent =
        broadcast(
            context,
            widgetId,
            requestCode = widgetId * 10 + 9,
            action = PlanMeWidgetReceiver.ACTION_REFRESH,
        )

    private fun broadcast(
        context: Context,
        widgetId: Int,
        requestCode: Int,
        action: String,
        extras: (Intent) -> Unit = {},
    ): PendingIntent {
        val intent = Intent(context, PlanMeWidgetReceiver::class.java).apply {
            this.action = action
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
            extras(this)
        }
        return PendingIntent.getBroadcast(
            context, requestCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }
}
