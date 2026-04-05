在 `D:\Workspace\PlanMe\apps\desktop` 目录下执行 Android debug 打包：

```bash
cd "D:\Workspace\PlanMe\apps\desktop" && pnpm tauri android build --debug 2>&1 | tail -20
```

打包成功后输出 APK 路径：
`D:\Workspace\PlanMe\apps\desktop\src-tauri\gen\android\app\build\outputs\apk\universal\debug\app-universal-debug.apk`

如果编译失败，运行以下命令查看具体 Kotlin/Gradle 错误：

```bash
cd "D:\Workspace\PlanMe\apps\desktop\src-tauri\gen\android" && ./gradlew :app:compileUniversalDebugKotlin 2>&1 | grep -E "e:|error:|Error|\.kt:" | head -30
```

注意事项：
- 不要直接运行 `./gradlew assembleDebug`，会因为找不到 `pnpm` 报错
- 必须通过 `pnpm tauri android build --debug` 来确保环境变量正确传入
