'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Scissors, Save, Loader2 } from 'lucide-react';
import type { Video } from '@spool/db/types';

interface TrimEditorProps {
  video: Video;
  onSave: (trimStart: number, trimEnd: number) => Promise<void>;
}

export function TrimEditor({ video, onSave }: TrimEditorProps) {
  const duration = (video.duration_seconds ?? 0) * 1000;
  const [trimStart, setTrimStart] = useState(video.trim_start_ms ?? 0);
  const [trimEnd, setTrimEnd] = useState(video.trim_end_ms ?? duration);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const filmstripUrl = video.thumbnail_key
    ? `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/thumbnails/${video.id}_filmstrip.jpg`
    : null;

  const toPercent = useCallback(
    (ms: number) => (duration > 0 ? (ms / duration) * 100 : 0),
    [duration],
  );

  const fromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track || duration === 0) return 0;
      const rect = track.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.round(pct * duration);
    },
    [duration],
  );

  useEffect(() => {
    if (!isDragging) return;

    function handleMove(e: MouseEvent) {
      const ms = fromClientX(e.clientX);
      if (isDragging === 'start') {
        setTrimStart(Math.min(ms, trimEnd - 1000));
      } else {
        setTrimEnd(Math.max(ms, trimStart + 1000));
      }
    }

    function handleUp() {
      setIsDragging(null);
    }

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging, trimStart, trimEnd, fromClientX]);

  async function handleSave() {
    setSaving(true);
    await onSave(trimStart, trimEnd);
    setSaving(false);
  }

  if (duration === 0) return null;

  return (
    <div className="rounded-lg border border-border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Scissors className="h-4 w-4" />
          Trim
        </h3>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Save trim
        </button>
      </div>

      {/* Timeline track */}
      <div
        ref={trackRef}
        className="relative h-16 rounded-lg overflow-hidden bg-muted cursor-pointer"
        style={filmstripUrl ? {
          backgroundImage: `url(${filmstripUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : undefined}
      >
        {/* Dimmed regions outside trim */}
        <div
          className="absolute inset-y-0 left-0 bg-black/50"
          style={{ width: `${toPercent(trimStart)}%` }}
        />
        <div
          className="absolute inset-y-0 right-0 bg-black/50"
          style={{ width: `${100 - toPercent(trimEnd)}%` }}
        />

        {/* Start handle */}
        <div
          className="absolute inset-y-0 w-3 bg-primary/80 cursor-col-resize hover:bg-primary flex items-center justify-center"
          style={{ left: `${toPercent(trimStart)}%` }}
          onMouseDown={(e) => { e.preventDefault(); setIsDragging('start'); }}
        >
          <div className="w-0.5 h-6 bg-white/80 rounded-full" />
        </div>

        {/* End handle */}
        <div
          className="absolute inset-y-0 w-3 bg-primary/80 cursor-col-resize hover:bg-primary flex items-center justify-center"
          style={{ left: `${toPercent(trimEnd)}%`, transform: 'translateX(-100%)' }}
          onMouseDown={(e) => { e.preventDefault(); setIsDragging('end'); }}
        >
          <div className="w-0.5 h-6 bg-white/80 rounded-full" />
        </div>
      </div>

      {/* Time labels */}
      <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
        <span>{formatMs(trimStart)}</span>
        <span className="text-foreground font-medium">
          {formatMs(trimEnd - trimStart)} selected
        </span>
        <span>{formatMs(trimEnd)}</span>
      </div>
    </div>
  );
}

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
