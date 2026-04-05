将已构建的 Android debug APK 安装到当前连接的虚拟设备或真机：

```bash
ADB="$HOME/AppData/Local/Android/Sdk/platform-tools/adb.exe" && "$ADB" install -r "D:\Workspace\PlanMe\apps\desktop\src-tauri\gen\android\app\build\outputs\apk\universal\debug\app-universal-debug.apk" 2>&1
```

如果需要先构建再安装，依次执行：
1. 先运行 `/android-build`
2. 再运行 `/android-install`

常用 adb 辅助命令：

查看已连接设备：
```bash
"$HOME/AppData/Local/Android/Sdk/platform-tools/adb.exe" devices
```

清空 logcat 后监听 PlanMe 相关日志：
```bash
ADB="$HOME/AppData/Local/Android/Sdk/platform-tools/adb.exe"
"$ADB" logcat -c && "$ADB" logcat 2>&1 | grep -E "planme|widget|PlanMe|Exception" 
```

查看 App 的 plans 目录文件：
```bash
"$HOME/AppData/Local/Android/Sdk/platform-tools/adb.exe" shell run-as com.planme.desktop find plans/ -name "*.md"
```
