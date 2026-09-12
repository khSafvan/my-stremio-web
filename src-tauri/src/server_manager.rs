use std::net::{SocketAddr, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};

#[cfg(target_os = "linux")]
use std::os::unix::process::CommandExt;

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
        TcpStream::connect_timeout(&addr, Duration::from_millis(150)).is_ok()
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

    /// Path to the PID file used to track running instances
    fn pid_file_path() -> Option<PathBuf> {
        Self::find_server_path().and_then(|p| p.parent().map(|dir| dir.join("server.pid")))
    }

    /// Clean up any stale or lingering server process from a previous abnormal termination
    fn cleanup_stale_pid() {
        let Some(pid_file) = Self::pid_file_path() else { return; };
        if let Ok(content) = std::fs::read_to_string(&pid_file) {
            if let Ok(pid) = content.trim().parse::<i32>() {
                #[cfg(target_os = "linux")]
                unsafe {
                    // Check if process is alive
                    if libc::kill(pid, 0) == 0 {
                        // If it's listening and responsive, we can let it be or cleanly terminate it if stale
                        if !Self::is_server_listening() {
                            println!("[Tauri] Cleaning up stale unresponsive streaming server PID: {}", pid);
                            libc::kill(pid, libc::SIGTERM);
                            std::thread::sleep(Duration::from_millis(150));
                            if libc::kill(pid, 0) == 0 {
                                libc::kill(pid, libc::SIGKILL);
                            }
                        }
                    }
                }
                #[cfg(not(target_os = "linux"))]
                let _ = pid;
            }
            let _ = std::fs::remove_file(&pid_file);
        }
    }

    /// Start the bundled streaming server if not already running
    pub fn start(&self) {
        if Self::is_server_listening() {
            println!("[Tauri] Streaming Server is already active and responsive on 127.0.0.1:11470.");
            return;
        }

        Self::cleanup_stale_pid();

        let Some(server_path) = Self::find_server_path() else {
            eprintln!("[Tauri] Could not locate server/server.js. Run './scripts/download-server.sh' first.");
            return;
        };

        let Some(node_bin) = Self::find_node_binary() else {
            eprintln!("[Tauri] Could not locate Node.js. Ensure Node.js (or NVM) is installed.");
            return;
        };

        println!("[Tauri] Spawning optimized streaming server with {:?} at {:?}", node_bin, server_path);

        let mut cmd = Command::new(&node_bin);

        // High-performance environment tuning
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

        // V8 runtime performance flags:
        // - --max-old-space-size=4096: Sufficient memory ceiling for high-bitrate 4K streaming caches
        // - --turbo-fast-api-calls: Enable fast V8 C++ API calls
        // - --no-warnings: Suppress node warning stderr overhead
        cmd.arg("--max-old-space-size=4096")
            .arg("--turbo-fast-api-calls")
            .arg("--no-warnings")
            .arg(&server_path)
            .stdout(Stdio::inherit())
            .stderr(Stdio::inherit());

        // On Linux, use prctl PR_SET_PDEATHSIG to guarantee the child receives SIGTERM
        // if the parent Tauri process exits, crashes, or is killed.
        #[cfg(target_os = "linux")]
        unsafe {
            cmd.pre_exec(|| {
                if libc::prctl(libc::PR_SET_PDEATHSIG, libc::SIGTERM) != 0 {
                    return Err(std::io::Error::last_os_error());
                }
                Ok(())
            });
        }

        match cmd.spawn() {
            Ok(child_process) => {
                let child_pid = child_process.id();
                if let Some(pid_file) = Self::pid_file_path() {
                    let _ = std::fs::write(pid_file, child_pid.to_string());
                }

                let mut guard = self.child.lock().unwrap();
                *guard = Some(child_process);
                println!("[Tauri] Streaming server spawned with PID: {}.", child_pid);
            }
            Err(err) => {
                eprintln!("[Tauri] Failed to spawn streaming server: {err}.");
                return;
            }
        }

        // Fast-poll loop (25ms intervals) for minimum launch latency
        println!("[Tauri] Waiting for streaming server on 127.0.0.1:11470...");
        let start_time = Instant::now();
        let timeout = Duration::from_secs(5);
        while start_time.elapsed() < timeout {
            if Self::is_server_listening() {
                println!("[Tauri] Streaming server online and accepting streams on 127.0.0.1:11470 (took {:?}).", start_time.elapsed());
                return;
            }
            std::thread::sleep(Duration::from_millis(25));
        }
        eprintln!("[Tauri] Warning: streaming server did not respond within {:?}", timeout);
    }

    /// Terminate the child process cleanly with graceful SIGTERM escalation to SIGKILL
    pub fn stop(&self) {
        let mut guard = match self.child.lock() {
            Ok(g) => g,
            Err(poisoned) => poisoned.into_inner(),
        };

        if let Some(mut child) = guard.take() {
            let pid = child.id();
            println!("[Tauri] Requesting graceful termination of streaming server (PID: {})...", pid);

            #[cfg(target_os = "linux")]
            unsafe {
                // Send SIGTERM to allow server.js to write state/flush caches cleanly
                libc::kill(pid as libc::pid_t, libc::SIGTERM);
            }

            #[cfg(not(target_os = "linux"))]
            let _ = child.kill();

            // Wait up to 1.2s for graceful exit
            let wait_start = Instant::now();
            let graceful_limit = Duration::from_millis(1200);
            let mut exited = false;

            while wait_start.elapsed() < graceful_limit {
                match child.try_wait() {
                    Ok(Some(status)) => {
                        println!("[Tauri] Streaming server exited gracefully with status: {:?}.", status);
                        exited = true;
                        break;
                    }
                    Ok(None) => {
                        std::thread::sleep(Duration::from_millis(20));
                    }
                    Err(err) => {
                        eprintln!("[Tauri] Error waiting on server child: {:?}.", err);
                        break;
                    }
                }
            }

            // Escalate to SIGKILL if child didn't exit within graceful window
            if !exited {
                println!("[Tauri] Child did not exit within graceful timeout; escalating to SIGKILL...");
                let _ = child.kill();
                let _ = child.wait();
            }

            // Remove PID file
            if let Some(pid_file) = Self::pid_file_path() {
                let _ = std::fs::remove_file(pid_file);
            }

            println!("[Tauri] Streaming server shutdown complete.");
        }
    }
}
