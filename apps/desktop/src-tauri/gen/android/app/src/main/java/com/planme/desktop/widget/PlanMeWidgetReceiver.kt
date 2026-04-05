package com.planme.desktop.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

class PlanMeWidgetReceiver : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        // 先立即渲染一次（避免 initialLayout 阶段就报 Can't load widget）
        appWidgetIds.forEach { widgetId ->
            PlanMeWidget.updateWidget(context, appWidgetManager, widgetId)
        }
        scheduleWork(context)
        WorkManager.getInstance(context).enqueue(
            OneTimeWorkRequestBuilder<PlanMeWidgetWorker>().build()
        )
    }

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        appWidgetIds.forEach { PlanMeWidgetState.removeWidget(context, it) }
    }

    override fun onDisabled(context: Context) {
        WorkManager.getInstance(context).cancelUniqueWork(PlanMeWidgetWorker.WORK_NAME)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        if (intent.action == ACTION_SWITCH_TAB) {
            val widgetId = intent.getIntExtra(
                AppWidgetManager.EXTRA_APPWIDGET_ID,
                AppWidgetManager.INVALID_APPWIDGET_ID
            )
            val tabIdx = intent.getIntExtra(EXTRA_TAB_IDX, 0)
            if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) return

            PlanMeWidgetState.setActiveIdx(context, widgetId, tabIdx)
            PlanMeWidget.updateWidget(
                context,
                AppWidgetManager.getInstance(context),
                widgetId
            )
        }
    }

    companion object {
        const val ACTION_SWITCH_TAB = "com.planme.desktop.widget.ACTION_SWITCH_TAB"
        const val EXTRA_TAB_IDX = "extra_tab_idx"

        fun scheduleWork(context: Context) {
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                PlanMeWidgetWorker.WORK_NAME,
                ExistingPeriodicWorkPolicy.UPDATE,
                PeriodicWorkRequestBuilder<PlanMeWidgetWorker>(30, TimeUnit.MINUTES).build()
            )
        }
    }
}
