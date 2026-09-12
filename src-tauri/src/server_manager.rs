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

        println!("[Tauri] Spawning optimized embedded streaming server at {:?}", server_path);

        // Auto-detect JS runtime: prefer 'bun' if available, otherwise 'node'
        let runtime = if Command::new("bun").arg("--version").output().is_ok() {
            "bun"
        } else {
            "node"
        };

        let mut cmd = Command::new(runtime);
        cmd.env("UV_THREADPOOL_SIZE", "32")
            .env("NODE_ENV", "production");

        if let Some(parent) = server_path.parent() {
            cmd.env("SETTINGS_PATH", parent);
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
                println!("[Tauri] Embedded streaming server spawned with high-performance profile (32 workers, 4GB heap, unthrottled bandwidth).");
            }
            Err(err) => {
                eprintln!("[Tauri] Failed to spawn streaming server: {err}. Ensure 'node' is installed in PATH.");
            }
        }
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

impl Drop for ServerManager {
    fn drop(&mut self) {
        self.stop();
    }
}
