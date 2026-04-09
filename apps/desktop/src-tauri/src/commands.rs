use crate::capture::CaptureState;
use serde::Serialize;
use tauri::State;

#[derive(Serialize)]
pub struct StopResult {
    #[serde(rename = "outputPath")]
    output_path: String,
    #[serde(rename = "durationSeconds")]
    duration_seconds: u64,
    #[serde(rename = "shareUrl")]
    share_url: String,
}

#[tauri::command]
pub async fn start_recording(
    state: State<'_, CaptureState>,
    mode: String,
) -> Result<(), String> {
    state.start(&mode).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn stop_recording(
    state: State<'_, CaptureState>,
) -> Result<StopResult, String> {
    let (output_path, duration) = state.stop().map_err(|e| e.to_string())?;

    // TODO: Upload to R2 and get share URL
    // For now, return a placeholder
    let share_url = format!(
        "http://localhost:3000/share/{}",
        hex::encode(&output_path.to_string_lossy().as_bytes()[..8])
    );

    Ok(StopResult {
        output_path: output_path.to_string_lossy().to_string(),
        duration_seconds: duration,
        share_url,
    })
}

#[derive(Serialize)]
pub struct RecordingStatus {
    recording: bool,
    #[serde(rename = "elapsedSeconds")]
    elapsed_seconds: u64,
}

#[tauri::command]
pub async fn get_recording_status(
    state: State<'_, CaptureState>,
) -> Result<RecordingStatus, String> {
    Ok(RecordingStatus {
        recording: state.is_recording(),
        elapsed_seconds: state.elapsed_seconds(),
    })
}
