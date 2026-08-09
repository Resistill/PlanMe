package com.planme.desktop.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.planme.desktop.R
import java.util.concurrent.TimeUnit

class PlanMeWidgetReceiver : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        // 直接读盘刷新，而不是只重绘缓存后把活儿丢给 WorkManager —— 后者在
        // Doze / 厂商省电策略下可能长时间不执行，正是小组件不自动刷新的主因。
        PlanMeWidgetData.refresh(context)
        scheduleWork(context)
    }

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        appWidgetIds.forEach { PlanMeWidgetState.removeWidget(context, it) }
    }

    override fun onDisabled(context: Context) {
        WorkManager.getInstance(context).cancelUniqueWork(PlanMeWidgetWorker.WORK_NAME)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        when (intent.action) {
            ACTION_SWITCH_TAB -> {
                val widgetId = intent.getIntExtra(
                    AppWidgetManager.EXTRA_APPWIDGET_ID,
                    AppWidgetManager.INVALID_APPWIDGET_ID
                )
                if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) return

                PlanMeWidgetState.setActiveIdx(
                    context, widgetId, intent.getIntExtra(EXTRA_TAB_IDX, 0)
                )
                val manager = AppWidgetManager.getInstance(context)
                PlanMeWidget.updateWidget(context, manager, widgetId)
                manager.notifyAppWidgetViewDataChanged(widgetId, R.id.widget_list)
            }

            ACTION_REFRESH -> PlanMeWidgetData.refresh(context)
        }
    }

    companion object {
        const val ACTION_SWITCH_TAB = "com.planme.desktop.widget.ACTION_SWITCH_TAB"
        const val ACTION_REFRESH = "com.planme.desktop.widget.ACTION_REFRESH"
        const val EXTRA_TAB_IDX = "extra_tab_idx"

        /** 周期性兜底刷新。15 分钟是 WorkManager 允许的最小间隔。 */
        fun scheduleWork(context: Context) {
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                PlanMeWidgetWorker.WORK_NAME,
                // UPDATE：既能把旧版本 30 分钟的间隔改过来，又不会像 REPLACE
                // 那样每次进 App 都把计时重置、导致周期任务永远轮不上
                ExistingPeriodicWorkPolicy.UPDATE,
                PeriodicWorkRequestBuilder<PlanMeWidgetWorker>(15, TimeUnit.MINUTES).build()
            )
        }

        /** 立即刷新一次（延迟若干秒，用于等待编辑器把文件落盘） */
        fun requestRefresh(context: Context, delaySeconds: Long = 0) {
            WorkManager.getInstance(context).enqueue(
                OneTimeWorkRequestBuilder<PlanMeWidgetWorker>()
                    .setInitialDelay(delaySeconds, TimeUnit.SECONDS)
                    .build()
            )
        }
    }
}
