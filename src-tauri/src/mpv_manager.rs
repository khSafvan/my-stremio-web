use std::io::{BufRead, BufReader, Write};
use std::os::unix::net::UnixStream;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

#[cfg(target_os = "linux")]
use std::os::unix::process::CommandExt;

static OBSERVE_ID_COUNTER: AtomicU64 = AtomicU64::new(10);

pub struct MpvManager {
    child: Mutex<Option<Child>>,
    stream: Mutex<Option<UnixStream>>,
    socket_path: PathBuf,
}

impl MpvManager {
    pub fn new() -> Self {
        let socket_path = std::env::temp_dir().join(format!("stremio-mpv-{}.sock", std::process::id()));
        Self {
            child: Mutex::new(None),
            stream: Mutex::new(None),
            socket_path,
        }
    }

    pub fn is_running(&self) -> bool {
        let mut child_guard = self.child.lock().unwrap();
        let stream_guard = self.stream.lock().unwrap();

        if let Some(ref mut child) = *child_guard {
            match child.try_wait() {
                Ok(None) => stream_guard.is_some(),
                _ => false,
            }
        } else {
            false
        }
    }

    pub fn start(&self, app_handle: &AppHandle) -> Result<(), String> {
        if self.is_running() {
            return Ok(());
        }

        let mut child_guard = self.child.lock().unwrap();
        let mut stream_guard = self.stream.lock().unwrap();

        // Cleanup any previous socket file
        let _ = std::fs::remove_file(&self.socket_path);

        println!("[MpvManager] Starting background mpv in headless idle mode...");

        let mut cmd = Command::new("mpv");
        cmd.arg("--idle=yes")
            .arg(format!("--input-ipc-server={}", self.socket_path.display()))
            .arg("--hwdec=auto")
            .arg("--force-window=no")
            .arg("--autofit=85%")
            .arg("--title=Stremio")
            .arg("--vo=gpu-next,gpu")
            .arg("--hr-seek=yes")
            .arg("--sub-auto=fuzzy")
            .arg("--keepaspect=yes")
            .stdout(Stdio::null())
            .stderr(Stdio::null());

        #[cfg(target_os = "linux")]
        unsafe {
            cmd.pre_exec(|| {
                if libc::prctl(libc::PR_SET_PDEATHSIG, libc::SIGTERM) != 0 {
                    return Err(std::io::Error::last_os_error());
                }
                Ok(())
            });
        }

        let child = cmd.spawn().map_err(|e| format!("Failed to spawn mpv: {}", e))?;
        *child_guard = Some(child);

        // Wait for socket to be created and connect
        let start = Instant::now();
        let mut connected_stream = None;
        while start.elapsed() < Duration::from_millis(3000) {
            if self.socket_path.exists() {
                if let Ok(s) = UnixStream::connect(&self.socket_path) {
                    connected_stream = Some(s);
                    break;
                }
            }
            std::thread::sleep(Duration::from_millis(30));
        }

        let stream = connected_stream.ok_or_else(|| "Timed out waiting for mpv IPC socket".to_string())?;

        // Spawn background reader thread to forward mpv IPC events to Tauri frontend
        if let Ok(reader_stream) = stream.try_clone() {
            let app = app_handle.clone();
            std::thread::spawn(move || {
                let reader = BufReader::new(reader_stream);
                for line in reader.lines() {
                    let Ok(line_str) = line else { break };
                    if let Ok(val) = serde_json::from_str::<serde_json::Value>(&line_str) {
                        if let Some(event) = val.get("event").and_then(|e| e.as_str()) {
                            match event {
                                "property-change" => {
                                    if let Some(name) = val.get("name").and_then(|n| n.as_str()) {
                                        let data = val.get("data").cloned().unwrap_or(serde_json::Value::Null);
                                        let _ = app.emit(
                                            "mpv-prop-change",
                                            serde_json::json!({
                                                "name": name,
                                                "data": data,
                                            }),
                                        );
                                    }
                                }
                                "playback-restart" | "file-loaded" => {
                                    // Notify frontend that video is ready and playing
                                    let _ = app.emit(
                                        "mpv-prop-change",
                                        serde_json::json!({
                                            "name": "paused-for-cache",
                                            "data": false,
                                        }),
                                    );
                                    let _ = app.emit(
                                        "mpv-prop-change",
                                        serde_json::json!({
                                            "name": "loaded",
                                            "data": true,
                                        }),
                                    );
                                }
                                "end-file" => {
                                    let reason = val.get("reason").and_then(|r| r.as_str()).unwrap_or("eof");
                                    let is_error = reason == "error";
                                    let _ = app.emit(
                                        "mpv-event-ended",
                                        serde_json::json!({
                                            "reason": reason,
                                            "error": if is_error { Some("MPV playback error") } else { None },
                                        }),
                                    );
                                    let _ = app.emit(
                                        "mpv-prop-change",
                                        serde_json::json!({
                                            "name": "eof-reached",
                                            "data": true,
                                        }),
                                    );
                                }
                                _ => {}
                            }
                        }
                    }
                }
            });
        }

        *stream_guard = Some(stream);
        println!("[MpvManager] MPV background process connected successfully");
        Ok(())
    }

    pub fn send_command(&self, app_handle: &AppHandle, method: &str, args: serde_json::Value) -> Result<(), String> {
        self.start(app_handle)?;

        let command_payload = match method {
            "mpv-command" => {
                serde_json::json!({
                    "command": args,
                })
            }
            "mpv-set-prop" => {
                if let Some(arr) = args.as_array() {
                    if arr.len() >= 2 {
                        // Crucial: Ignore vo=libmpv because we render directly to MPV's GPU window
                        if arr[0] == "vo" && arr[1] == "libmpv" {
                            println!("[MpvManager] Preserving GPU window (ignoring vo=libmpv)");
                            return Ok(());
                        }

                        serde_json::json!({
                            "command": ["set_property", arr[0], arr[1]],
                        })
                    } else {
                        return Err("Invalid arguments for mpv-set-prop".to_string());
                    }
                } else {
                    return Err("Expected array for mpv-set-prop".to_string());
                }
            }
            "mpv-observe-prop" => {
                let prop_name = if let Some(arr) = args.as_array() {
                    arr.first().and_then(|v| v.as_str()).unwrap_or("")
                } else if let Some(s) = args.as_str() {
                    s
                } else {
                    ""
                };
                let id = OBSERVE_ID_COUNTER.fetch_add(1, Ordering::SeqCst);
                serde_json::json!({
                    "command": ["observe_property", id, prop_name],
                })
            }
            "mpv-set-gpu-video-processing" => {
                let hwdec = if args.as_bool().unwrap_or(true) { "auto" } else { "no" };
                serde_json::json!({
                    "command": ["set_property", "hwdec", hwdec],
                })
            }
            _ => {
                println!("[MpvManager] Unknown method: {}", method);
                return Ok(());
            }
        };

        let mut stream_guard = self.stream.lock().unwrap();
        if let Some(ref mut stream) = *stream_guard {
            let mut payload_bytes = serde_json::to_vec(&command_payload).map_err(|e| e.to_string())?;
            payload_bytes.push(b'\n');
            stream.write_all(&payload_bytes).map_err(|e| format!("Failed to write to mpv socket: {}", e))?;
            stream.flush().map_err(|e| format!("Failed to flush mpv socket: {}", e))?;
        }

        Ok(())
    }

    pub fn stop(&self) {
        if let Ok(mut stream_guard) = self.stream.lock() {
            if let Some(ref mut stream) = *stream_guard {
                let quit_msg = b"{\"command\": [\"quit\"]}\n";
                let _ = stream.write_all(quit_msg);
                let _ = stream.flush();
            }
            *stream_guard = None;
        }

        if let Ok(mut child_guard) = self.child.lock() {
            if let Some(ref mut child) = *child_guard {
                let _ = child.kill();
                let _ = child.wait();
            }
            *child_guard = None;
        }

        let _ = std::fs::remove_file(&self.socket_path);
    }
}

impl Drop for MpvManager {
    fn drop(&mut self) {
        self.stop();
    }
}
