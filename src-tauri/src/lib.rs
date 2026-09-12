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
    let server_manager_setup = server_manager.clone();
    let server_manager_panic = server_manager.clone();

    // Register panic hook to guarantee child process cleanup on Rust panics
    let default_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |panic_info| {
        eprintln!("[Tauri Panic Hook] Emergency cleanup: stopping streaming server...");
        server_manager_panic.stop();
        default_hook(panic_info);
    }));

    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .invoke_handler(tauri::generate_handler![get_server_status])
        .setup(move |_app| {
            // Start the streaming server if needed
            server_manager_setup.start();
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(move |_app_handle, event| {
            match event {
                tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit => {
                    server_manager.stop();
                }
                tauri::RunEvent::WindowEvent {
                    event: tauri::WindowEvent::Destroyed,
                    ..
                } => {
                    // Window destroyed
                }
                _ => {}
            }
        });
}
