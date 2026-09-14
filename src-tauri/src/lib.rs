mod server_manager;
mod mpv_manager;

use std::sync::Arc;
use server_manager::ServerManager;
use mpv_manager::MpvManager;

#[tauri::command]
fn get_server_status() -> serde_json::Value {
    let healthy = ServerManager::is_server_healthy();
    let listening = healthy || ServerManager::is_server_listening();
    serde_json::json!({
        "running": listening,
        "healthy": healthy,
        "url": if listening { "http://127.0.0.1:11470" } else { "" }
    })
}

#[tauri::command]
fn shell_get_info() -> serde_json::Value {
    serde_json::json!({
        "shellVersion": "4.4.168",
        "gpuVideoProcessing": "true",
        "nativeAssSubtitles": "true",
        "hasMpv": true
    })
}

#[tauri::command]
fn shell_send_mpv(
    app_handle: tauri::AppHandle,
    state: tauri::State<Arc<MpvManager>>,
    method: String,
    args: Option<serde_json::Value>,
) -> Result<(), String> {
    state.send_command(&app_handle, &method, args.unwrap_or(serde_json::Value::Null))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let server_manager = Arc::new(ServerManager::new());
    let server_manager_setup = server_manager.clone();
    let server_manager_panic = server_manager.clone();

    let mpv_manager = Arc::new(MpvManager::new());
    let mpv_manager_setup = mpv_manager.clone();
    let mpv_manager_exit = mpv_manager.clone();
    let mpv_manager_panic = mpv_manager.clone();

    // Register panic hook to guarantee child process cleanup on Rust panics
    let default_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |panic_info| {
        eprintln!("[Tauri Panic Hook] Emergency cleanup: stopping streaming server and mpv...");
        server_manager_panic.stop();
        mpv_manager_panic.stop();
        default_hook(panic_info);
    }));

    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .manage(mpv_manager)
        .invoke_handler(tauri::generate_handler![
            get_server_status,
            shell_get_info,
            shell_send_mpv
        ])
        .setup(move |app| {
            // Start the streaming server if needed
            server_manager_setup.start();
            // Start background MPV in headless idle mode so IPC is immediately available
            if let Err(e) = mpv_manager_setup.start(&app.handle().clone()) {
                eprintln!("[Tauri Setup] Warning: Failed to pre-start mpv: {}", e);
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(move |_app_handle, event| {
            match event {
                tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit => {
                    server_manager.stop();
                    mpv_manager_exit.stop();
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
