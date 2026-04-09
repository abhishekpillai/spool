'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import type { Video } from '@spool/db/types';

interface VideoPlayerProps {
  video: Video;
}

export function VideoPlayer({ video }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const playlistUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${video.hls_base_key}playlist.m3u8`;
  const trimStart = (video.trim_start_ms ?? 0) / 1000;
  const trimEnd = video.trim_end_ms ? video.trim_end_ms / 1000 : Infinity;

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !video.hls_base_key) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        maxBufferLength: 30,
        enableWorker: true,
      });

      hls.loadSource(playlistUrl);
      hls.attachMedia(videoEl);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (trimStart > 0) {
          videoEl.currentTime = trimStart;
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });

      hlsRef.current = hls;
      return () => hls.destroy();
    } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari/iOS native HLS
      videoEl.src = playlistUrl;
      videoEl.addEventListener('loadedmetadata', () => {
        if (trimStart > 0) videoEl.currentTime = trimStart;
      });
    }
  }, [playlistUrl, trimStart]);

  // Enforce trim boundaries
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    function handleTimeUpdate() {
      const t = videoEl!.currentTime;
      setCurrentTime(t);

      if (t < trimStart) {
        videoEl!.currentTime = trimStart;
      } else if (t >= trimEnd) {
        videoEl!.pause();
        videoEl!.currentTime = trimStart;
        setPlaying(false);
      }
    }

    function handleDurationChange() {
      const effectiveDuration = Math.min(videoEl!.duration, trimEnd) - trimStart;
      setDuration(effectiveDuration);
    }

    videoEl.addEventListener('timeupdate', handleTimeUpdate);
    videoEl.addEventListener('durationchange', handleDurationChange);
    videoEl.addEventListener('play', () => setPlaying(true));
    videoEl.addEventListener('pause', () => setPlaying(false));

    return () => {
      videoEl.removeEventListener('timeupdate', handleTimeUpdate);
      videoEl.removeEventListener('durationchange', handleDurationChange);
    };
  }, [trimStart, trimEnd]);

  function togglePlay() {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    if (videoEl.paused) {
      videoEl.play();
    } else {
      videoEl.pause();
    }
  }

  function changeSpeed() {
    const speeds = [1, 1.25, 1.5, 1.75, 2];
    const idx = speeds.indexOf(playbackRate);
    const next = speeds[(idx + 1) % speeds.length];
    setPlaybackRate(next);
    if (videoRef.current) videoRef.current.playbackRate = next;
  }

  return (
    <div className="space-y-2">
      <div
        className="relative aspect-video bg-black rounded-xl overflow-hidden cursor-pointer"
        onClick={togglePlay}
      >
        <video
          ref={videoRef}
          className="w-full h-full"
          playsInline
        />
        {!playing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="rounded-full bg-white/90 p-4">
              <svg className="h-8 w-8 text-black ml-1" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>{formatTime(currentTime - trimStart)}</span>
        <button
          onClick={changeSpeed}
          className="px-2 py-0.5 rounded hover:bg-muted transition-colors font-mono"
        >
          {playbackRate}x
        </button>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
