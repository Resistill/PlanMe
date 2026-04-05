use tauri::{AppHandle, Emitter, Manager};

#[tauri::command]
pub fn toggle_sticker_mode(app: AppHandle, enabled: bool, opacity: f64) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("main window not found")?;

    if enabled {
        window.set_decorations(false).map_err(|e| e.to_string())?;
        window
            .set_always_on_top(true)
            .map_err(|e| e.to_string())?;
        app.emit("sticker-opacity", opacity)
            .map_err(|e| e.to_string())?;
        window
            .set_ignore_cursor_events(true)
            .map_err(|e| e.to_string())?;
    } else {
        window
            .set_ignore_cursor_events(false)
            .map_err(|e| e.to_string())?;
        window
            .set_always_on_top(false)
            .map_err(|e| e.to_string())?;
        app.emit("sticker-opacity", 1.0)
            .map_err(|e| e.to_string())?;
        window.set_decorations(true).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn set_sticker_opacity(app: AppHandle, opacity: f64) -> Result<(), String> {
    app.emit("sticker-opacity", opacity)
        .map_err(|e| e.to_string())?;
    Ok(())
}
