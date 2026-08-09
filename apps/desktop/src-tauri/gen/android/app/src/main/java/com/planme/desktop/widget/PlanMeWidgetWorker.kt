package com.planme.desktop.widget

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters

/** 周期性/延迟刷新的执行体，真正的逻辑都在 [PlanMeWidgetData] */
class PlanMeWidgetWorker(
    private val context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    companion object {
        const val WORK_NAME = "planme_widget_refresh"
    }

    override suspend fun doWork(): Result {
        // refresh() 内部已经吞掉了读盘异常；这里不返回 retry，避免退避重试
        // 把周期任务的排期越推越远
        PlanMeWidgetData.refresh(context)
        return Result.success()
    }
}
