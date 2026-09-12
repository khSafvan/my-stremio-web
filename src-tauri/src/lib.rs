mod server_manager;

use std::sync::Arc;
use server_manager::ServerManager;

#[tauri::command]
fn get_server_status() -> serde_json::Value {
    let listening = ServerManager::is_server_listening();
    serde_json::json!({
        "running": listening,
        "url": if listening { "http://127.0.0.1:11470" } else { "" }
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let server_manager = Arc::new(ServerManager::new());
    let server_manager_clone = server_manager.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .invoke_handler(tauri::generate_handler![get_server_status])
        .setup(move |_app| {
            // Start the streaming server if needed
            server_manager_clone.start();
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(move |_app_handle, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                server_manager.stop();
            }
        });
}
