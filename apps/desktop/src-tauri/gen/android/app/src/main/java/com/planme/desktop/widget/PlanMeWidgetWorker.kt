package com.planme.desktop.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import java.io.File

class PlanMeWidgetWorker(
    private val context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    companion object {
        const val WORK_NAME = "planme_widget_refresh"
    }

    override suspend fun doWork(): Result {
        return try {
            // Tauri's appDataDir() on Android = context.dataDir (NOT context.filesDir)
            val plansDir = File(context.dataDir, "plans")
            if (!plansDir.exists() || !plansDir.isDirectory) return Result.success()

            val sorted = plansDir.listFiles { f -> f.extension == "md" }
                ?.sortedByDescending { it.lastModified() }
                ?: return Result.success()

            val file0 = sorted.getOrNull(0)
            val file1 = sorted.getOrNull(1)

            val title0 = file0?.nameWithoutExtension ?: ""
            // 格式："level\ttitle"，保留层级信息
            val tasks0 = file0?.let {
                WidgetTaskParser.uncompletedTasks(it.readText(), 6).map { t -> "${t.level}\t${t.title}" }
            } ?: emptyList()

            val title1 = file1?.nameWithoutExtension ?: ""
            val tasks1 = file1?.let {
                WidgetTaskParser.uncompletedTasks(it.readText(), 6).map { t -> "${t.level}\t${t.title}" }
            } ?: emptyList()

            val manager = AppWidgetManager.getInstance(context)
            val widgetIds = manager.getAppWidgetIds(
                ComponentName(context, PlanMeWidgetReceiver::class.java)
            )

            widgetIds.forEach { widgetId ->
                PlanMeWidgetState.saveWidgetData(
                    context, widgetId, title0, tasks0, title1, tasks1
                )
                PlanMeWidget.updateWidget(context, manager, widgetId)
            }

            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }
}
