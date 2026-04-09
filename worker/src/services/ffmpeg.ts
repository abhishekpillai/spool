import { execaCommand } from 'execa';
import path from 'path';
import { mkdir } from 'fs/promises';

export async function generateHLS(inputPath: string, outputDir: string): Promise<void> {
  await mkdir(outputDir, { recursive: true });

  // Generate HLS with 3 quality tiers
  await execaCommand(
    `ffmpeg -i ${inputPath} \
      -filter_complex "[0:v]split=3[v1][v2][v3]; \
        [v1]scale=w=1920:h=1080:force_original_aspect_ratio=decrease[v1out]; \
        [v2]scale=w=1280:h=720:force_original_aspect_ratio=decrease[v2out]; \
        [v3]scale=w=854:h=480:force_original_aspect_ratio=decrease[v3out]" \
      -map "[v1out]" -map 0:a? -c:v:0 libx264 -preset fast -crf 22 -b:v:0 4000k -maxrate:v:0 4000k -bufsize:v:0 8000k -c:a:0 aac -b:a:0 192k \
      -map "[v2out]" -map 0:a? -c:v:1 libx264 -preset fast -crf 23 -b:v:1 2500k -maxrate:v:1 2500k -bufsize:v:1 5000k -c:a:1 aac -b:a:1 128k \
      -map "[v3out]" -map 0:a? -c:v:2 libx264 -preset fast -crf 24 -b:v:2 1000k -maxrate:v:2 1000k -bufsize:v:2 2000k -c:a:2 aac -b:a:2 96k \
      -f hls \
      -hls_time 6 \
      -hls_playlist_type vod \
      -hls_flags independent_segments \
      -hls_segment_type mpegts \
      -hls_segment_filename "${outputDir}/stream_%v/seg%03d.ts" \
      -master_pl_name "playlist.m3u8" \
      -var_stream_map "v:0,a:0,name:1080p v:1,a:1,name:720p v:2,a:2,name:480p" \
      "${outputDir}/stream_%v/playlist.m3u8"`,
    { shell: true },
  );
}

export async function generateThumbnail(inputPath: string, outputPath: string): Promise<void> {
  await execaCommand(
    `ffmpeg -i "${inputPath}" \
      -ss 00:00:02 \
      -vframes 1 \
      -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2" \
      -q:v 2 \
      "${outputPath}"`,
    { shell: true },
  );
}

export async function generateFilmstrip(inputPath: string, outputPath: string): Promise<void> {
  await execaCommand(
    `ffmpeg -i "${inputPath}" \
      -vf "fps=1/5,scale=160:90,tile=20x1" \
      -frames:v 1 \
      "${outputPath}"`,
    { shell: true },
  );
}

export async function extractAudio(inputPath: string, outputPath: string): Promise<void> {
  await execaCommand(
    `ffmpeg -i "${inputPath}" \
      -vn -ac 1 -ar 16000 -c:a pcm_s16le \
      "${outputPath}"`,
    { shell: true },
  );
}

export async function getDuration(inputPath: string): Promise<number> {
  const { stdout } = await execaCommand(
    `ffprobe -v error -show_entries format=duration -of csv=p=0 "${inputPath}"`,
    { shell: true },
  );
  return Math.round(parseFloat(stdout.trim()));
}
