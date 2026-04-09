'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Video } from '@spool/db/types';
import { VideoPlayer } from './video-player';
import { TranscriptPanel } from './transcript-panel';
import { Loader2 } from 'lucide-react';

const STATUS_MESSAGES: Record<string, string> = {
  uploading: 'Upload in progress...',
  uploaded: 'Processing your video...',
  transcoding: 'Transcoding to multiple qualities...',
  transcribed: 'Generating AI summary...',
};

export function ProcessingState({ initialVideo }: { initialVideo: Video }) {
  const [video, setVideo] = useState(initialVideo);
  const supabase = createClient();

  useEffect(() => {
    if (video.status === 'ready' || video.status === 'error') return;

    const channel = supabase
      .channel(`video:${video.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'videos',
          filter: `id=eq.${video.id}`,
        },
        (payload) => {
          setVideo(payload.new as Video);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [video.id, video.status, supabase]);

  if (video.status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="rounded-full bg-red-100 p-4">
          <svg className="h-8 w-8 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <p className="text-sm text-muted-foreground">
          Something went wrong processing this video.
        </p>
        {video.processing_error && (
          <p className="text-xs text-red-600 max-w-md text-center">
            {video.processing_error}
          </p>
        )}
      </div>
    );
  }

  if (video.status !== 'ready') {
    const message = STATUS_MESSAGES[video.status] ?? 'Processing...';
    return (
      <div className="space-y-6">
        <div className="aspect-video bg-muted rounded-xl flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{message}</p>
          <p className="text-xs text-muted-foreground/60">
            This usually takes 1-2 minutes. This page updates automatically.
          </p>
        </div>
      </div>
    );
  }

  // Video is ready — show player + transcript
  return (
    <div className="space-y-6">
      <VideoPlayer video={video} />

      {video.auto_summary && (
        <div className="rounded-lg bg-muted/50 p-4">
          <h3 className="text-sm font-medium mb-1">Summary</h3>
          <p className="text-sm text-muted-foreground">{video.auto_summary}</p>
        </div>
      )}

      {video.transcript && <TranscriptPanel transcript={video.transcript} />}
    </div>
  );
}
