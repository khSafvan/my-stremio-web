use std::net::{SocketAddr, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::Duration;

pub struct ServerManager {
    child: Mutex<Option<Child>>,
}

impl ServerManager {
    pub fn new() -> Self {
        Self {
            child: Mutex::new(None),
        }
    }

    /// Check if a streaming server is already responsive on 127.0.0.1:11470
    pub fn is_server_listening() -> bool {
        let addr: SocketAddr = "127.0.0.1:11470".parse().unwrap();
        TcpStream::connect_timeout(&addr, Duration::from_millis(400)).is_ok()
    }

    /// Find the path to server.js
    fn find_server_path() -> Option<PathBuf> {
        // Candidate 1: relative to current working directory (development & local runs)
        let local_server = Path::new("server/server.js");
        if local_server.exists() {
            return Some(local_server.to_path_buf());
        }

        // Candidate 2: parent directory relative to src-tauri
        let parent_server = Path::new("../server/server.js");
        if parent_server.exists() {
            return Some(parent_server.to_path_buf());
        }

        // Candidate 3: relative to current executable location
        if let Ok(exe) = std::env::current_exe() {
            if let Some(exe_dir) = exe.parent() {
                let bundled = exe_dir.join("server").join("server.js");
                if bundled.exists() {
                    return Some(bundled);
                }
                let bundled_root = exe_dir.join("server.js");
                if bundled_root.exists() {
                    return Some(bundled_root);
                }
            }
        }

        None
    }

    /// Locate Node.js binary (checks PATH, NVM, standard Linux paths)
    fn find_node_binary() -> Option<PathBuf> {
        // 1. Check if node is in standard PATH
        if let Ok(output) = Command::new("node").arg("--version").output() {
            if output.status.success() {
                return Some(PathBuf::from("node"));
            }
        }

        // 2. Check NVM versions in ~/.nvm/versions/node/
        if let Ok(home) = std::env::var("HOME") {
            let nvm_node_dir = Path::new(&home).join(".nvm/versions/node");
            if nvm_node_dir.exists() {
                if let Ok(entries) = std::fs::read_dir(nvm_node_dir) {
                    let mut versions: Vec<PathBuf> = entries
                        .filter_map(|e| e.ok().map(|e| e.path()))
                        .filter(|p| p.is_dir())
                        .collect();
                    versions.sort();
                    if let Some(latest) = versions.last() {
                        let node_bin = latest.join("bin/node");
                        if node_bin.exists() {
                            return Some(node_bin);
                        }
                    }
                }
            }
        }

        // 3. Fallback to standard locations
        for candidate in &["/usr/bin/node", "/usr/local/bin/node"] {
            let p = Path::new(candidate);
            if p.exists() {
                return Some(p.to_path_buf());
            }
        }

        None
    }

    /// Start the bundled streaming server if not already running
    pub fn start(&self) {
        if Self::is_server_listening() {
            println!("[Tauri] Stremio Streaming Server is already active on 127.0.0.1:11470.");
            return;
        }

        let Some(server_path) = Self::find_server_path() else {
            eprintln!("[Tauri] Could not locate server/server.js. Run './scripts/download-server.sh' first.");
            return;
        };

        let Some(node_bin) = Self::find_node_binary() else {
            eprintln!("[Tauri] Could not locate Node.js. Ensure Node.js (or NVM) is installed.");
            return;
        };

        println!("[Tauri] Spawning streaming server with {:?} at {:?}", node_bin, server_path);

        let mut cmd = Command::new(&node_bin);
        cmd.env("UV_THREADPOOL_SIZE", "32")
            .env("NODE_ENV", "production")
            .env("NO_CORS", "1");

        if let Some(parent) = server_path.parent() {
            cmd.env("SETTINGS_PATH", parent);

            let settings_file = parent.join("server-settings.json");
            let default_settings = parent.join("server-settings.default.json");
            if !settings_file.exists() && default_settings.exists() {
                let _ = std::fs::copy(&default_settings, &settings_file);
            }
        }

        // Auto-detect system hardware-accelerated FFmpeg / FFprobe
        if Path::new("/usr/bin/ffmpeg").exists() {
            cmd.env("FFMPEG_BIN", "/usr/bin/ffmpeg");
        }
        if Path::new("/usr/bin/ffprobe").exists() {
            cmd.env("FFPROBE_BIN", "/usr/bin/ffprobe");
        }

        cmd.arg("--max-old-space-size=4096")
            .arg("--no-warnings")
            .arg(&server_path)
            .stdout(Stdio::inherit())
            .stderr(Stdio::inherit());

        match cmd.spawn() {
            Ok(child_process) => {
                let mut guard = self.child.lock().unwrap();
                *guard = Some(child_process);
                println!("[Tauri] Embedded streaming server spawned.");
            }
            Err(err) => {
                eprintln!("[Tauri] Failed to spawn streaming server: {err}.");
            }
        }

        // Wait synchronously until the server is ready and accepting requests on 127.0.0.1:11470
        println!("[Tauri] Waiting for streaming server on 127.0.0.1:11470...");
        let start_time = std::time::Instant::now();
        let timeout = Duration::from_secs(5);
        while start_time.elapsed() < timeout {
            if Self::is_server_listening() {
                println!("[Tauri] Streaming server is online and ready on 127.0.0.1:11470 (took {:?}).", start_time.elapsed());
                return;
            }
            std::thread::sleep(Duration::from_millis(100));
        }
        eprintln!("[Tauri] Warning: streaming server did not respond within {:?}", timeout);
    }

    /// Terminate the child process cleanly
    pub fn stop(&self) {
        let mut guard = self.child.lock().unwrap();
        if let Some(mut child) = guard.take() {
            println!("[Tauri] Stopping embedded streaming server child process...");
            let _ = child.kill();
            let _ = child.wait();
            println!("[Tauri] Embedded streaming server child terminated.");
        }
    }
}
