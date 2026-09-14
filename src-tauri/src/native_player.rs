use std::ffi::{CString, c_char, c_void};
use std::sync::{Arc, Mutex};
use std::sync::atomic::{AtomicU64, Ordering};
use tauri::{AppHandle, Emitter};

use gtk::prelude::*;
use libmpv2::{
    Format, Mpv,
    events::{Event, PropertyData},
    render::{OpenGLInitParams, RenderContext, RenderParam, RenderParamApiType},
};

static OBSERVE_COUNTER: AtomicU64 = AtomicU64::new(100);

type GlProcFn = unsafe extern "C" fn(*const c_char) -> *mut c_void;

// Function pointer resolver for EGL/GLX/OpenGL
fn resolve_gl_symbol(name: &str) -> *mut c_void {
    let Ok(c_name) = CString::new(name) else { return std::ptr::null_mut(); };

    // 1. Try RTLD_DEFAULT first (process already links libepoxy, libGL, libEGL)
    unsafe {
        let ptr = libc::dlsym(libc::RTLD_DEFAULT, c_name.as_ptr());
        if !ptr.is_null() {
            return ptr;
        }
    }

    // 2. Try eglGetProcAddress (Wayland / EGL) - keep library handle permanently open
    unsafe {
        static EGL_GET_PROC: std::sync::OnceLock<Option<GlProcFn>> = std::sync::OnceLock::new();
        let egl_proc = EGL_GET_PROC.get_or_init(|| {
            let handle = libc::dlopen(b"libEGL.so.1\0".as_ptr() as *const c_char, libc::RTLD_LAZY | libc::RTLD_GLOBAL);
            if !handle.is_null() {
                let sym = libc::dlsym(handle, b"eglGetProcAddress\0".as_ptr() as *const c_char);
                if !sym.is_null() {
                    return Some(std::mem::transmute(sym));
                }
            }
            None
        });

        if let Some(func) = egl_proc {
            let ptr = func(c_name.as_ptr());
            if !ptr.is_null() {
                return ptr;
            }
        }
    }

    // 3. Try glXGetProcAddressARB (X11 / GLX) - keep library handle permanently open
    unsafe {
        static GLX_GET_PROC: std::sync::OnceLock<Option<GlProcFn>> = std::sync::OnceLock::new();
        let glx_proc = GLX_GET_PROC.get_or_init(|| {
            let handle = libc::dlopen(b"libGL.so.1\0".as_ptr() as *const c_char, libc::RTLD_LAZY | libc::RTLD_GLOBAL);
            if !handle.is_null() {
                let sym = libc::dlsym(handle, b"glXGetProcAddressARB\0".as_ptr() as *const c_char);
                if !sym.is_null() {
                    return Some(std::mem::transmute(sym));
                }
            }
            None
        });

        if let Some(func) = glx_proc {
            let ptr = func(c_name.as_ptr());
            if !ptr.is_null() {
                return ptr;
            }
        }
    }

    std::ptr::null_mut()
}

fn gl_get_proc_address(_ctx: &(), name: &str) -> *mut c_void {
    resolve_gl_symbol(name)
}

// GL_FRAMEBUFFER_BINDING constant
const GL_FRAMEBUFFER_BINDING: u32 = 0x8CA6;

type GlGetIntegervFn = unsafe extern "C" fn(u32, *mut i32);

fn get_current_fbo() -> i32 {
    static GL_GET_INTEGERV: std::sync::OnceLock<Option<GlGetIntegervFn>> = std::sync::OnceLock::new();
    let func_opt = GL_GET_INTEGERV.get_or_init(|| {
        let ptr = resolve_gl_symbol("glGetIntegerv");
        if !ptr.is_null() {
            Some(unsafe { std::mem::transmute(ptr) })
        } else {
            None
        }
    });

    let mut fbo: i32 = 0;
    if let Some(func) = func_opt {
        unsafe {
            func(GL_FRAMEBUFFER_BINDING, &mut fbo);
        }
    }
    fbo
}

#[derive(Clone)]
#[allow(dead_code)]
pub struct NativePlayer {
    mpv: Arc<Mutex<Mpv>>,
    render_context: Arc<Mutex<Option<RenderContext>>>,
    app_handle: AppHandle,
}

unsafe impl Send for NativePlayer {}
unsafe impl Sync for NativePlayer {}

fn detect_ram_tier() -> (usize, &'static str, &'static str, &'static str) {
    let mut total_kb = 8 * 1024 * 1024; // fallback 8GB
    if let Ok(meminfo) = std::fs::read_to_string("/proc/meminfo") {
        for line in meminfo.lines() {
            if line.starts_with("MemTotal:") {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 2 {
                    if let Ok(kb) = parts[1].parse::<usize>() {
                        total_kb = kb;
                        break;
                    }
                }
            }
        }
    }
    let total_gb = total_kb / (1024 * 1024);
    if total_gb <= 8 {
        // Tier 1 (<= 8GB, e.g. i3 6th Gen / Intel HD 520 / low-memory laptops)
        // 128MB forward buffer, 32MB seekback cache, 90s readahead
        (1, "134217728", "33554432", "90")
    } else if total_gb <= 16 {
        // Tier 2 (8GB - 16GB, mid-tier machines / discrete 920MX / Iris)
        // 300MB forward buffer, 64MB seekback cache, 180s readahead
        (2, "314572800", "67108864", "180")
    } else {
        // Tier 3 (> 16GB, gaming / workstation PCs)
        // 600MB forward buffer, 128MB seekback cache, 240s readahead
        (3, "629145600", "134217728", "240")
    }
}

fn get_shaders_dir() -> std::path::PathBuf {
    if let Ok(xdg) = std::env::var("XDG_DATA_HOME") {
        if !xdg.is_empty() {
            return std::path::PathBuf::from(xdg).join("stremio").join("shaders");
        }
    }
    if let Ok(home) = std::env::var("HOME") {
        return std::path::PathBuf::from(home).join(".local").join("share").join("stremio").join("shaders");
    }
    std::path::PathBuf::from("/tmp/stremio-shaders")
}

fn install_shaders() {
    let dir = get_shaders_dir();
    if let Err(e) = std::fs::create_dir_all(&dir) {
        eprintln!("[NativePlayer] Warning: Could not create shaders dir {:?}: {}", dir, e);
        return;
    }

    let cas_glsl = include_str!("../shaders/cas.glsl");
    let anime_glsl = include_str!("../shaders/anime4k_lite.glsl");

    let _ = std::fs::write(dir.join("cas.glsl"), cas_glsl);
    let _ = std::fs::write(dir.join("anime4k_lite.glsl"), anime_glsl);
    println!("[NativePlayer] Installed AI enhancement shaders to {:?}", dir);
}

impl NativePlayer {
    pub fn new(app_handle: AppHandle) -> Result<(Self, gtk::GLArea), String> {
        // libmpv strictly requires LC_NUMERIC to be set to "C" for decimal parsing
        unsafe {
            libc::setlocale(libc::LC_NUMERIC, b"C\0".as_ptr() as *const libc::c_char);
        }

        install_shaders();
        let (tier, max_bytes, max_back_bytes, readahead_secs) = detect_ram_tier();
        println!(
            "[NativePlayer] Hardware Resource Tier {}: demuxer-max-bytes={}, demuxer-max-back-bytes={}, readahead={}s",
            tier, max_bytes, max_back_bytes, readahead_secs
        );

        let mpv = Mpv::with_initializer(|init| {
            init.set_property("vo", "libmpv")?;
            init.set_property("hwdec", "auto")?;
            init.set_property("keepaspect", "yes")?;
            init.set_property("terminal", "no")?;
            init.set_property("msg-level", "all=warn")?;
            // Tiered single-stream aggressive caching
            init.set_property("demuxer-max-bytes", max_bytes)?;
            init.set_property("demuxer-max-back-bytes", max_back_bytes)?;
            init.set_property("demuxer-readahead-secs", readahead_secs)?;
            init.set_property("cache", "yes")?;
            init.set_property("cache-secs", "300")?;
            init.set_property("demuxer-seekable-cache", "yes")?;
            // AI shaders explicitly OFF by default (0 compute overhead)
            init.set_property("glsl-shaders", "")?;
            Ok(())
        })
        .map_err(|e| format!("Failed to initialize libmpv: {}", e))?;

        let _ = mpv.disable_deprecated_events();
        let _ = mpv.command("change-list", &["glsl-shaders", "clr", ""]);

        let gl_area = gtk::GLArea::new();
        gl_area.set_has_alpha(true);
        gl_area.set_has_depth_buffer(false);
        gl_area.set_has_stencil_buffer(false);
        gl_area.set_hexpand(true);
        gl_area.set_vexpand(true);

        let mpv_arc = Arc::new(Mutex::new(mpv));
        let render_ctx_arc = Arc::new(Mutex::new(None));

        let player = Self {
            mpv: mpv_arc.clone(),
            render_context: render_ctx_arc.clone(),
            app_handle: app_handle.clone(),
        };

        // Connect GLArea realize signal to initialize libmpv RenderContext
        {
            let mpv_clone = mpv_arc.clone();
            let render_ctx_clone = render_ctx_arc.clone();
            let gl_area_weak = gl_area.downgrade();

            gl_area.connect_realize(move |area| {
                let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                    area.make_current();
                    if area.error().is_some() {
                        eprintln!("[NativePlayer] GLArea realize error");
                        return;
                    }

                    let Ok(mut mpv_guard) = mpv_clone.lock() else {
                        eprintln!("[NativePlayer] Lock error during realize");
                        return;
                    };
                    let mpv_handle = unsafe { mpv_guard.ctx.as_mut() };

                    let render_params = vec![
                        RenderParam::ApiType(RenderParamApiType::OpenGl),
                        RenderParam::InitParams(OpenGLInitParams {
                            get_proc_address: gl_get_proc_address,
                            ctx: (),
                        }),
                    ];

                    match RenderContext::new(mpv_handle, render_params) {
                        Ok(mut rc) => {
                            let (sender, receiver) = gtk::glib::MainContext::channel::<()>(gtk::glib::Priority::default());
                            let gl_area_cb = gl_area_weak.clone();
                            receiver.attach(None, move |()| {
                                if let Some(area) = gl_area_cb.upgrade() {
                                    area.queue_render();
                                }
                                gtk::glib::ControlFlow::Continue
                            });

                            rc.set_update_callback(move || {
                                let _ = sender.send(());
                            });
                            if let Ok(mut guard) = render_ctx_clone.lock() {
                                *guard = Some(rc);
                            }
                            println!("[NativePlayer] libmpv OpenGL RenderContext initialized successfully");
                        }
                        Err(e) => {
                            eprintln!("[NativePlayer] Failed to create RenderContext: {}", e);
                        }
                    }
                }));
            });
        }

        // Connect GLArea render signal
        {
            let render_ctx_clone = render_ctx_arc.clone();
            gl_area.connect_render(move |area, _context| {
                let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                    let fbo = get_current_fbo();
                    let scale = area.scale_factor();
                    let width = area.allocated_width() * scale;
                    let height = area.allocated_height() * scale;

                    if width > 0 && height > 0 {
                        if let Ok(mut guard) = render_ctx_clone.lock() {
                            if let Some(ref mut rc) = *guard {
                                let _ = rc.render::<()>(fbo, width, height, true);
                            }
                        }
                    }
                }));
                gtk::glib::Propagation::Proceed
            });
        }

        // Connect GLArea unrealize signal
        {
            let render_ctx_clone = render_ctx_arc.clone();
            gl_area.connect_unrealize(move |area| {
                let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                    area.make_current();
                    if let Ok(mut guard) = render_ctx_clone.lock() {
                        if let Some(rc) = guard.take() {
                            drop(rc);
                        }
                    }
                }));
            });
        }

        // Spawn background thread to poll mpv events and forward to Tauri frontend
        {
            let mpv_event_clone = mpv_arc.clone();
            let app_event = app_handle.clone();
            std::thread::spawn(move || {
                loop {
                    let has_event = {
                        if let Ok(mut mpv_guard) = mpv_event_clone.lock() {
                            if let Some(Ok(event)) = mpv_guard.wait_event(0.0) {
                                match event {
                                    Event::PropertyChange { name, change, .. } => {
                                        let data = match change {
                                            PropertyData::Str(s) => {
                                                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(s) {
                                                    parsed
                                                } else {
                                                    serde_json::Value::String(s.to_string())
                                                }
                                            }
                                            PropertyData::OsdStr(s) => {
                                                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(s) {
                                                    parsed
                                                } else {
                                                    serde_json::Value::String(s.to_string())
                                                }
                                            }
                                            PropertyData::Flag(b) => serde_json::Value::Bool(b),
                                            PropertyData::Double(f) => serde_json::json!(f),
                                            PropertyData::Int64(i) => serde_json::json!(i),
                                        };

                                        let _ = app_event.emit(
                                            "mpv-prop-change",
                                            serde_json::json!({
                                                "name": name,
                                                "data": data,
                                            }),
                                        );
                                    }
                                    Event::PlaybackRestart | Event::FileLoaded => {
                                        let _ = app_event.emit(
                                            "mpv-prop-change",
                                            serde_json::json!({
                                                "name": "paused-for-cache",
                                                "data": false,
                                            }),
                                        );
                                    }
                                    Event::EndFile(reason) => {
                                        let reason_str = match reason {
                                            0 => "eof",
                                            2 => "stop",
                                            3 => "quit",
                                            4 => "error",
                                            _ => "other",
                                        };

                                        let _ = app_event.emit(
                                            "mpv-event-ended",
                                            serde_json::json!({
                                                "reason": reason_str,
                                                "error": if reason_str == "error" { Some("Playback error") } else { None },
                                            }),
                                        );
                                        let _ = app_event.emit(
                                            "mpv-prop-change",
                                            serde_json::json!({
                                                "name": "eof-reached",
                                                "data": true,
                                            }),
                                        );
                                    }
                                    _ => {}
                                }
                                true
                            } else {
                                false
                            }
                        } else {
                            break;
                        }
                    };

                    if !has_event {
                        std::thread::sleep(std::time::Duration::from_millis(10));
                    }
                }
            });
        }

        Ok((player, gl_area))
    }

    pub fn send_command(&self, method: &str, args: serde_json::Value) -> Result<(), String> {
        let mpv = self.mpv.lock().map_err(|_| "Failed to lock MPV".to_string())?;

        match method {
            "mpv-command" => {
                if let Some(arr) = args.as_array() {
                    let str_args: Vec<String> = arr.iter().map(|v| match v {
                        serde_json::Value::String(s) => s.clone(),
                        serde_json::Value::Number(n) => n.to_string(),
                        serde_json::Value::Bool(b) => b.to_string(),
                        _ => String::new(),
                    }).collect();

                    if let Some(cmd) = str_args.first() {
                        let rest_refs: Vec<&str> = str_args.iter().skip(1).map(|s| s.as_str()).collect();
                        mpv.command(cmd, &rest_refs)
                            .map_err(|e| format!("mpv-command failed: {}", e))?;
                    }
                }
            }
            "mpv-set-prop" => {
                if let Some(arr) = args.as_array() {
                    if arr.len() >= 2 {
                        let prop_name = arr[0].as_str().unwrap_or("");
                        if prop_name == "vo" {
                            return Ok(());
                        }

                        let val_str = match &arr[1] {
                            serde_json::Value::String(s) => s.clone(),
                            serde_json::Value::Bool(b) => if *b { "yes".to_string() } else { "no".to_string() },
                            serde_json::Value::Number(n) => n.to_string(),
                            _ => "".to_string(),
                        };

                        mpv.set_property(prop_name, val_str.as_str())
                            .map_err(|e| format!("mpv-set-prop failed: {}", e))?;
                    }
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

                if !prop_name.is_empty() {
                    let id = OBSERVE_COUNTER.fetch_add(1, Ordering::SeqCst);
                    let format = match prop_name {
                        "volume" | "time-pos" | "duration" | "sub-delay" | "speed" | "sub-scale" | "sub-pos" => Format::Double,
                        "pause" | "seeking" | "eof-reached" | "paused-for-cache" => Format::Flag,
                        _ => Format::String,
                    };
                    let _ = mpv.observe_property(prop_name, format, id);
                }
            }
            "mpv-set-ai-enhancement" | "set-ai-enhancement" => {
                let mode = if let Some(arr) = args.as_array() {
                    arr.first().and_then(|v| v.as_str()).unwrap_or("off")
                } else if let Some(s) = args.as_str() {
                    s
                } else {
                    "off"
                };

                let shaders_dir = get_shaders_dir();
                match mode {
                    "cas" => {
                        let path = shaders_dir.join("cas.glsl").to_string_lossy().to_string();
                        println!("[NativePlayer] AI Enhancement: AMD FidelityFX CAS enabled ({})", path);
                        let _ = mpv.command("change-list", &["glsl-shaders", "set", &path]);
                    }
                    "anime4k" => {
                        let path = shaders_dir.join("anime4k_lite.glsl").to_string_lossy().to_string();
                        println!("[NativePlayer] AI Enhancement: Anime4K Lite enabled ({})", path);
                        let _ = mpv.command("change-list", &["glsl-shaders", "set", &path]);
                    }
                    _ => {
                        println!("[NativePlayer] AI Enhancement: Disabled (Off)");
                        let _ = mpv.command("change-list", &["glsl-shaders", "clr", ""]);
                    }
                }

                let _ = self.app_handle.emit(
                    "mpv-prop-change",
                    serde_json::json!({
                        "name": "ai-enhancement",
                        "data": mode,
                    }),
                );
            }
            _ => {}
        }

        Ok(())
    }

    pub fn stop(&self) {
        if let Ok(mpv) = self.mpv.lock() {
            let _ = mpv.command("stop", &[]);
        }
    }
}
