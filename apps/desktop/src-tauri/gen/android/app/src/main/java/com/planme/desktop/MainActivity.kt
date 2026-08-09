package com.planme.desktop

import android.os.Bundle
import android.view.View
import android.webkit.WebView
import androidx.activity.OnBackPressedCallback
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.planme.desktop.widget.PlanMeWidgetData
import com.planme.desktop.widget.PlanMeWidgetReceiver

class MainActivity : TauriActivity() {

  private var rustWebView: WebView? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
    applyImeInsets()
  }

  /**
   * 键盘避让。
   *
   * 应用是 edge-to-edge 的，而 targetSdk 35+ 下 windowSoftInputMode="adjustResize"
   * 已经不再生效，Tauri 的生成代码里也没有任何 inset 处理 —— 结果就是软键盘直接
   * 盖住编辑器下半屏。这里手动把 IME 的高度转成内容区的 bottom padding，
   * WebView 被压缩后 CodeMirror 会自己把光标滚进可视区域。
   *
   * 导航栏/状态栏仍然交给 CSS 的 env(safe-area-inset-*) 处理，所以这里只在
   * 键盘确实高于导航栏时才加 padding。
   */
  private fun applyImeInsets() {
    val root = findViewById<View>(android.R.id.content) ?: return
    ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
      val ime = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom
      val navBar = insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom
      val bottom = if (ime > navBar) ime else 0
      view.setPadding(view.paddingLeft, view.paddingTop, view.paddingRight, bottom)
      insets
    }
    ViewCompat.requestApplyInsets(root)
  }

  /**
   * 返回键。
   *
   * TauriActivity 把 handleBackNavigation 设成了 false，所以 WryActivity 里那套
   * "先走 WebView 历史"的逻辑没有注册，按返回键会直接退出 App。这里自己注册一份：
   * 前端在进入编辑器时 pushState，于是返回键先回到文件列表，再按才退出。
   */
  override fun onWebViewCreate(webView: WebView) {
    super.onWebViewCreate(webView)
    rustWebView = webView

    onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
      override fun handleOnBackPressed() {
        val wv = rustWebView
        if (wv != null && wv.canGoBack()) {
          wv.goBack()
        } else {
          isEnabled = false
          onBackPressedDispatcher.onBackPressed()
          isEnabled = true
        }
      }
    })
  }

  override fun onResume() {
    super.onResume()
    PlanMeWidgetReceiver.scheduleWork(this)
    PlanMeWidgetData.refresh(this)
  }

  override fun onPause() {
    super.onPause()
    // 退到后台时立刻刷新，让编辑结果马上出现在桌面小组件上。
    // WebView 端在 visibilitychange 里触发保存，落盘可能稍晚于 onPause，
    // 因此再补一次延迟刷新。
    PlanMeWidgetData.refresh(this)
    PlanMeWidgetReceiver.requestRefresh(this, delaySeconds = 3)
  }
}
