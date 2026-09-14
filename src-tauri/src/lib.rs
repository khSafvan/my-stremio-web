mod native_player;

use native_player::NativePlayer;

#[tauri::command]
fn get_server_status() -> serde_json::Value {
    serde_json::json!({
        "running": true,
        "healthy": true,
        "url": ""
    })
}

#[tauri::command]
fn shell_get_info() -> serde_json::Value {
    serde_json::json!({
        "shellVersion": "5.0.0",
        "gpuVideoProcessing": "true",
        "nativeAssSubtitles": "true",
        "hasMpv": true
    })
}

#[tauri::command]
fn shell_send_mpv(
    state: tauri::State<NativePlayer>,
    method: String,
    args: Option<serde_json::Value>,
) -> Result<(), String> {
    state.send_command(&method, args.unwrap_or(serde_json::Value::Null))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            get_server_status,
            shell_get_info,
            shell_send_mpv
        ])
        .setup(move |app| {
            use tauri::Manager;

            #[cfg(target_os = "linux")]
            {
                use gtk::prelude::*;
                if let Some(window) = app.get_webview_window("main") {
                    if let Ok(gtk_win) = window.gtk_window() {
                        let children = gtk_win.children();
                        if let Some(top_child) = children.first() {
                            // Tao wraps the webview in a default GtkBox inside GtkWindow.
                            // Extract the inner webview so its parent().parent() directly references GtkWindow.
                            let (real_wv, old_container) = if let Ok(container) = top_child.clone().downcast::<gtk::Container>() {
                                let sub_children = container.children();
                                if let Some(first_sub) = sub_children.first() {
                                    (first_sub.clone(), Some(container))
                                } else {
                                    (top_child.clone(), None)
                                }
                            } else {
                                (top_child.clone(), None)
                            };

                            if let Some(ref c) = old_container {
                                c.remove(&real_wv);
                            }
                            gtk_win.remove(top_child);

                            let overlay = gtk::Overlay::new();
                            overlay.set_hexpand(true);
                            overlay.set_vexpand(true);
                            real_wv.set_hexpand(true);
                            real_wv.set_vexpand(true);

                            gtk_win.add(&overlay);

                            let app_handle = app.handle().clone();
                            match NativePlayer::new(app_handle) {
                                Ok((player, gl_area)) => {
                                    overlay.add(&gl_area);
                                    overlay.add_overlay(&real_wv);
                                    gl_area.show();
                                    real_wv.show();
                                    overlay.show();

                                    let p1 = real_wv.parent().map(|p| p.type_().name().to_string());
                                    let p2 = real_wv.parent().and_then(|p| p.parent()).map(|p| p.type_().name().to_string());
                                    println!("[Tauri Setup] Webview parent hierarchy: {:?} -> {:?}", p1, p2);

                                    app.manage(player);
                                    println!("[Tauri Setup] Embedded libmpv GLArea and Overlay configured");
                                }
                                Err(e) => {
                                    eprintln!("[Tauri Setup] Failed to create NativePlayer: {}", e);
                                    overlay.add_overlay(&real_wv);
                                    real_wv.show();
                                    overlay.show();
                                }
                            }
                        }
                    }
                }
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(move |app_handle, event| {
            use tauri::Manager;
            match event {
                tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit => {
                    if let Some(player) = app_handle.try_state::<NativePlayer>() {
                        player.stop();
                    }
                }
                tauri::RunEvent::WindowEvent {
                    event: tauri::WindowEvent::Destroyed,
                    ..
                } => {}
                _ => {}
            }
        });
}
