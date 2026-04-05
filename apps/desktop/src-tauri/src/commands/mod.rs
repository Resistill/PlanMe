pub mod sticker;

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to PlanMe.", name)
}
