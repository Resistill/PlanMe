package com.planme.desktop

import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.planme.desktop.widget.PlanMeWidgetReceiver
import com.planme.desktop.widget.PlanMeWidgetWorker

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }

  override fun onResume() {
    super.onResume()
    PlanMeWidgetReceiver.scheduleWork(this)
    WorkManager.getInstance(this).enqueue(
      OneTimeWorkRequestBuilder<PlanMeWidgetWorker>().build()
    )
  }
}
