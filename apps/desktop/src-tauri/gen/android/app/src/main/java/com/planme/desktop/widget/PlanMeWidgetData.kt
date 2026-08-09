package com.planme.desktop.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.util.Log
import com.planme.desktop.R
import java.io.File

/**
 * 唯一的数据刷新入口：读 plans 目录 → 写入缓存 → 重绘所有小组件。
 *
 * 读取的是两个很小的 markdown 文件，耗时在毫秒级，因此可以直接在
 * onUpdate / onReceive 里同步调用，不必依赖 WorkManager 是否被系统放行。
 */
object PlanMeWidgetData {
    private const val TAG = "PlanMeWidget"

    fun refresh(context: Context) {
        val manager = AppWidgetManager.getInstance(context)
        val widgetIds = manager.getAppWidgetIds(
            ComponentName(context, PlanMeWidgetReceiver::class.java)
        )
        if (widgetIds.isEmpty()) return

        try {
            // Tauri 的 appDataDir() 在 Android 上 = context.dataDir（不是 filesDir）
            val plansDir = File(context.dataDir, "plans")
            val sorted = plansDir
                .takeIf { it.isDirectory }
                ?.listFiles { f -> f.isFile && f.extension == "md" }
                ?.sortedByDescending { it.lastModified() }
                .orEmpty()

            val file0 = sorted.getOrNull(0)
            val file1 = sorted.getOrNull(1)

            PlanMeWidgetState.saveWidgetData(
                context,
                title0 = file0?.nameWithoutExtension ?: "",
                lines0 = parse(file0),
                title1 = file1?.nameWithoutExtension ?: "",
                lines1 = parse(file1),
            )
        } catch (e: Exception) {
            // 读失败就沿用上一次的缓存，至少不让小组件变空白
            Log.w(TAG, "refresh failed", e)
        }

        widgetIds.forEach { PlanMeWidget.updateWidget(context, manager, it) }
        // 通知 ListView 重新向 RemoteViewsFactory 拉取数据
        manager.notifyAppWidgetViewDataChanged(widgetIds, R.id.widget_list)
    }

    private fun parse(file: File?): List<WidgetLine> =
        file?.runCatching { WidgetTaskParser.parse(readText()) }?.getOrNull().orEmpty()
}
