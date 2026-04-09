'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import type { Video } from '@spool/db/types';

export function UploadDropzone({
  onUploadComplete,
}: {
  onUploadComplete: (video: Video) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('video/')) {
      alert('Please select a video file');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      // 1. Init upload — get presigned URL + share token
      const initRes = await fetch('/api/upload/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'web', fileSize: file.size }),
      });
      const initData = await initRes.json();

      // 2. Upload to R2
      if (initData.uploadType === 'single') {
        await uploadWithProgress(initData.presignedUrl, file, setProgress);
      } else {
        // Multipart upload
        const parts: { PartNumber: number; ETag: string }[] = [];
        for (let i = 0; i < initData.presignedUrls.length; i++) {
          const start = i * initData.partSize;
          const end = Math.min(start + initData.partSize, file.size);
          const chunk = file.slice(start, end);

          const partRes = await fetch(initData.presignedUrls[i], {
            method: 'PUT',
            body: chunk,
          });
          parts.push({
            PartNumber: i + 1,
            ETag: partRes.headers.get('ETag')!,
          });
          setProgress(((i + 1) / initData.presignedUrls.length) * 100);
        }

        initData.parts = parts;
      }

      // 3. Complete upload
      await fetch('/api/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: initData.videoId,
          r2Key: initData.r2Key,
          uploadId: initData.uploadId,
          parts: initData.parts,
        }),
      });

      // 4. Notify parent with the new video
      const video: Video = {
        id: initData.videoId,
        share_token: initData.shareToken,
        status: 'uploaded',
        source: 'web',
        title: file.name.replace(/\.[^/.]+$/, ''),
        user_id: '',
        description: null,
        duration_seconds: null,
        recorded_at: new Date().toISOString(),
        raw_key: initData.r2Key,
        hls_base_key: null,
        thumbnail_key: null,
        processing_error: null,
        processing_started_at: null,
        processing_completed_at: null,
        transcript: null,
        transcript_srt: null,
        auto_title: null,
        auto_summary: null,
        is_public: true,
        trim_start_ms: 0,
        trim_end_ms: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      onUploadComplete(video);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [onUploadComplete]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
      onClick={() => inputRef.current?.click()}
      className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors ${
        dragOver
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-muted-foreground/40'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Uploading... {Math.round(progress)}%</p>
          <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Drag a video here or click to upload
          </p>
        </div>
      )}
    </div>
  );
}

async function uploadWithProgress(
  url: string,
  file: File,
  onProgress: (pct: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress((e.loaded / e.total) * 100);
    };
    xhr.onload = () => (xhr.status < 400 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(file);
  });
}
