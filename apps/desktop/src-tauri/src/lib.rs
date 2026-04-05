mod commands;

use std::sync::Mutex;
use tauri::{Emitter, Manager};

#[cfg(desktop)]
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
};
#[cfg(desktop)]
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

struct StickerState(Mutex<bool>);

#[cfg(desktop)]
fn apply_sticker_mode(
    window: &tauri::WebviewWindow,
    app: &tauri::AppHandle,
    enabled: bool,
) -> Result<(), Box<dyn std::error::Error>> {
    if enabled {
        window.set_decorations(false)?;
        window.set_always_on_top(true)?;
        app.emit("sticker-opacity", 0.85)?;
        window.set_ignore_cursor_events(true)?;
    } else {
        window.set_ignore_cursor_events(false)?;
        window.set_always_on_top(false)?;
        app.emit("sticker-opacity", 1.0)?;
        window.set_decorations(true)?;
    }
    app.emit("sticker-mode-changed", enabled)?;
    Ok(())
}

/// Check if window is visible on any monitor, reset to center if not
#[cfg(desktop)]
fn ensure_window_on_screen(window: &tauri::WebviewWindow) {
    let pos = match window.outer_position() {
        Ok(p) => p,
        Err(_) => return,
    };
    let size = match window.outer_size() {
        Ok(s) => s,
        Err(_) => return,
    };

    let monitors = match window.available_monitors() {
        Ok(m) => m,
        Err(_) => return,
    };

    let wx = pos.x as f64;
    let wy = pos.y as f64;
    let ww = size.width as f64;
    let wh = size.height as f64;
    let wcx = wx + ww / 2.0;
    let wcy = wy + wh / 2.0;

    // Check if window center is within any monitor
    let on_screen = monitors.iter().any(|m| {
        let mp = m.position();
        let ms = m.size();
        let mx = mp.x as f64;
        let my = mp.y as f64;
        let mw = ms.width as f64;
        let mh = ms.height as f64;
        wcx >= mx && wcx <= mx + mw && wcy >= my && wcy <= my + mh
    });

    if !on_screen {
        let _ = window.center();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init());

    #[cfg(desktop)]
    {
        builder = builder
            .plugin(tauri_plugin_autostart::init(
                tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                Some(vec!["--minimized"]),
            ))
            .plugin(tauri_plugin_global_shortcut::Builder::new().build())
            .plugin(tauri_plugin_window_state::Builder::new().build());
    }

    builder
        .manage(StickerState(Mutex::new(false)))
        .invoke_handler(tauri::generate_handler![
            commands::greet,
            commands::sticker::toggle_sticker_mode,
            commands::sticker::set_sticker_opacity,
        ])
        .setup(|app| {
            #[cfg(desktop)]
            {
                if let Some(window) = app.get_webview_window("main") {
                    ensure_window_on_screen(&window);
                }

                let show =
                    MenuItem::with_id(app, "show", "Show PlanMe", true, None::<&str>)?;
                let sticker =
                    MenuItem::with_id(app, "sticker", "Sticker Mode", true, None::<&str>)?;
                let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
                let menu = Menu::with_items(app, &[&show, &sticker, &quit])?;

                TrayIconBuilder::new()
                    .icon(app.default_window_icon().unwrap().clone())
                    .tooltip("PlanMe")
                    .menu(&menu)
                    .on_menu_event(|app, event| match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "sticker" => {
                            toggle_sticker(app);
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let tauri::tray::TrayIconEvent::DoubleClick { .. } = event {
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    })
                    .build(app)?;

                let shortcut =
                    Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyT);
                let handle = app.handle().clone();
                app.global_shortcut().on_shortcut(
                    shortcut,
                    move |_app, _shortcut, event| {
                        if event.state() == ShortcutState::Pressed {
                            toggle_sticker(&handle);
                        }
                    },
                )?;
            }

            app.emit("app-ready", ())?;

            Ok(())
        })
        .on_window_event(|window, event| {
            #[cfg(desktop)]
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let app = window.app_handle();
                let state = app.state::<StickerState>();
                let mut is_sticker = state.0.lock().unwrap();
                if *is_sticker {
                    *is_sticker = false;
                    drop(is_sticker);
                    if let Some(wv) = app.get_webview_window("main") {
                        let _ = apply_sticker_mode(&wv, app, false);
                    }
                }
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(desktop)]
fn toggle_sticker(app: &tauri::AppHandle) {
    let state = app.state::<StickerState>();
    let mut is_sticker = state.0.lock().unwrap();
    let new_value = !*is_sticker;
    *is_sticker = new_value;
    drop(is_sticker);

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = apply_sticker_mode(&window, app, new_value);
    }
}
