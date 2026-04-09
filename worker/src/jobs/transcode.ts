import type { Job } from 'bullmq';
import path from 'path';
import os from 'os';
import { mkdir, rm } from 'fs/promises';
import { createClient } from '@supabase/supabase-js';
import { downloadFromR2, uploadToR2, uploadDirectoryToR2 } from '../services/r2.js';
import { generateHLS, generateThumbnail, generateFilmstrip, extractAudio, getDuration } from '../services/ffmpeg.js';
import { transcribeAudio } from '../services/deepgram.js';
import { generateMetadata } from '../services/ai.js';

interface TranscodeJobData {
  videoId: string;
  r2Key: string;
  userId: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

export async function processTranscodeJob(job: Job<TranscodeJobData>) {
  const { videoId, r2Key } = job.data;
  const workDir = path.join(os.tmpdir(), `spool-${videoId}`);

  try {
    await mkdir(workDir, { recursive: true });
    await job.updateProgress(5);

    // 1. Download raw file
    const inputPath = path.join(workDir, 'input.webm');
    await downloadFromR2(r2Key, inputPath);
    await job.updateProgress(15);

    // 2. Update status
    await supabase.rpc('update_video_status', {
      p_video_id: videoId,
      p_status: 'transcoding',
    });

    // 3. Get duration
    const durationSeconds = await getDuration(inputPath);

    // 4. Run HLS transcode
    const hlsDir = path.join(workDir, 'hls');
    await generateHLS(inputPath, hlsDir);
    await job.updateProgress(55);

    // 5. Generate thumbnail + filmstrip
    const thumbPath = path.join(workDir, 'thumbnail.jpg');
    const filmstripPath = path.join(workDir, 'filmstrip.jpg');
    await Promise.all([
      generateThumbnail(inputPath, thumbPath),
      generateFilmstrip(inputPath, filmstripPath),
    ]);
    await job.updateProgress(60);

    // 6. Extract audio + transcribe
    const audioPath = path.join(workDir, 'audio.wav');
    await extractAudio(inputPath, audioPath);
    await job.updateProgress(65);

    const { transcript, srt } = await transcribeAudio(audioPath);
    await job.updateProgress(80);

    // 7. Update status to transcribed
    await supabase.rpc('update_video_status', {
      p_video_id: videoId,
      p_status: 'transcribed',
      p_transcript: transcript,
      p_transcript_srt: srt,
      p_duration_seconds: durationSeconds,
    });

    // 8. Generate title + summary
    const { title, summary } = await generateMetadata(transcript);
    await job.updateProgress(85);

    // 9. Upload HLS segments to R2
    const hlsBaseKey = `hls/${videoId}/`;
    await uploadDirectoryToR2(hlsDir, hlsBaseKey);

    // 10. Upload thumbnail + filmstrip
    const thumbnailKey = `thumbnails/${videoId}.jpg`;
    const filmstripKey = `thumbnails/${videoId}_filmstrip.jpg`;
    await Promise.all([
      uploadToR2(thumbPath, thumbnailKey, 'image/jpeg'),
      uploadToR2(filmstripPath, filmstripKey, 'image/jpeg'),
    ]);
    await job.updateProgress(95);

    // 11. Final status update — triggers Realtime
    await supabase.rpc('update_video_status', {
      p_video_id: videoId,
      p_status: 'ready',
      p_hls_base_key: hlsBaseKey,
      p_thumbnail_key: thumbnailKey,
      p_auto_title: title,
      p_auto_summary: summary,
    });

    await job.updateProgress(100);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await supabase.rpc('update_video_status', {
      p_video_id: videoId,
      p_status: 'error',
      p_error: message,
    });
    throw error;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
