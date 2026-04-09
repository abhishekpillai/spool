'use client';

import { useState } from 'react';
import type { Video } from '@spool/db/types';
import Link from 'next/link';
import { Copy, Trash2, Loader2, Check } from 'lucide-react';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  uploading: { label: 'Uploading', color: 'bg-yellow-100 text-yellow-800' },
  uploaded: { label: 'Processing', color: 'bg-blue-100 text-blue-800' },
  transcoding: { label: 'Transcoding', color: 'bg-blue-100 text-blue-800' },
  transcribed: { label: 'Almost ready', color: 'bg-blue-100 text-blue-800' },
  ready: { label: 'Ready', color: 'bg-green-100 text-green-800' },
  error: { label: 'Error', color: 'bg-red-100 text-red-800' },
};

export function VideoCard({
  video,
  onDelete,
}: {
  video: Video;
  onDelete: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const status = STATUS_LABELS[video.status] ?? STATUS_LABELS.uploading;
  const title = video.title || video.auto_title || 'Untitled recording';
  const shareUrl = `${window.location.origin}/share/${video.share_token}`;
  const thumbnailUrl = video.thumbnail_key
    ? `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${video.thumbnail_key}`
    : null;

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDelete() {
    if (!confirm('Delete this video? This cannot be undone.')) return;
    setDeleting(true);
    await fetch(`/api/videos/${video.id}`, { method: 'DELETE' });
    onDelete(video.id);
  }

  return (
    <div className="group relative rounded-xl border border-border bg-card overflow-hidden transition-shadow hover:shadow-md">
      <Link href={`/share/${video.share_token}`}>
        <div className="aspect-video bg-muted relative">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={title}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              {video.status === 'ready' ? (
                <span className="text-muted-foreground text-sm">No thumbnail</span>
              ) : (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              )}
            </div>
          )}
          <span className={`absolute top-2 right-2 text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>
            {status.label}
          </span>
        </div>
      </Link>

      <div className="p-3">
        <h3 className="font-medium text-sm truncate">{title}</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {new Date(video.created_at).toLocaleDateString()}
          {video.duration_seconds && ` \u00b7 ${formatDuration(video.duration_seconds)}`}
        </p>

        <div className="flex items-center gap-1 mt-2">
          <button
            onClick={copyLink}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded hover:bg-muted ml-auto"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
