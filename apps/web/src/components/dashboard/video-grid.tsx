'use client';

import { useState } from 'react';
import type { Video } from '@spool/db/types';
import { VideoCard } from './video-card';
import { UploadDropzone } from './upload-dropzone';

export function VideoGrid({ videos }: { videos: Video[] }) {
  const [videoList, setVideoList] = useState(videos);

  function handleUploadComplete(video: Video) {
    setVideoList((prev) => [video, ...prev]);
  }

  function handleDelete(videoId: string) {
    setVideoList((prev) => prev.filter((v) => v.id !== videoId));
  }

  return (
    <div className="space-y-6">
      <UploadDropzone onUploadComplete={handleUploadComplete} />

      {videoList.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">
            No videos yet. Record your first one or drag a file above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videoList.map((video) => (
            <VideoCard key={video.id} video={video} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
