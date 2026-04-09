use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::Instant;
use anyhow::Result;

pub struct CaptureState {
    inner: Mutex<Option<ActiveRecording>>,
}

struct ActiveRecording {
    ffmpeg_process: Child,
    output_path: PathBuf,
    start_time: Instant,
}

impl CaptureState {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(None),
        }
    }

    /// Start screen recording by spawning FFmpeg.
    ///
    /// Uses macOS avfoundation input to capture the screen.
    /// This is simpler than piping scap frames and works out of the box.
    /// For V2, we can integrate scap for lower latency and per-window capture.
    pub fn start(&self, mode: &str) -> Result<()> {
        let mut guard = self.inner.lock().unwrap();
        if guard.is_some() {
            anyhow::bail!("Already recording");
        }

        let output_dir = dirs::video_dir()
            .unwrap_or_else(|| dirs::home_dir().unwrap().join("Movies"))
            .join("Spool");

        std::fs::create_dir_all(&output_dir)?;

        let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
        let output_path = output_dir.join(format!("spool_{timestamp}.mp4"));

        // macOS: Use avfoundation to capture screen
        // Device "1" is typically the screen, "0" is the default mic
        let screen_device = if mode == "window" { "1" } else { "1" };

        let child = Command::new("ffmpeg")
            .args([
                "-f", "avfoundation",
                "-framerate", "30",
                "-capture_cursor", "1",
                "-i", &format!("{screen_device}:0"), // screen:mic
                "-c:v", "libx264",
                "-preset", "ultrafast",
                "-crf", "18",
                "-c:a", "aac",
                "-b:a", "192k",
                "-y",
                output_path.to_str().unwrap(),
            ])
            .stdin(Stdio::piped())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()?;

        *guard = Some(ActiveRecording {
            ffmpeg_process: child,
            output_path,
            start_time: Instant::now(),
        });

        Ok(())
    }

    /// Stop recording and return the output file path.
    pub fn stop(&self) -> Result<(PathBuf, u64)> {
        let mut guard = self.inner.lock().unwrap();
        let recording = guard.take().ok_or_else(|| anyhow::anyhow!("Not recording"))?;

        let elapsed = recording.start_time.elapsed().as_secs();
        let mut child = recording.ffmpeg_process;

        // Send 'q' to FFmpeg's stdin to stop gracefully
        if let Some(mut stdin) = child.stdin.take() {
            use std::io::Write;
            let _ = stdin.write_all(b"q");
        }

        // Wait for FFmpeg to finish
        let _ = child.wait();

        Ok((recording.output_path, elapsed))
    }

    pub fn is_recording(&self) -> bool {
        self.inner.lock().unwrap().is_some()
    }

    pub fn elapsed_seconds(&self) -> u64 {
        self.inner
            .lock()
            .unwrap()
            .as_ref()
            .map(|r| r.start_time.elapsed().as_secs())
            .unwrap_or(0)
    }
}
