import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { completeMultipartUpload } from '@/lib/r2';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { videoId, r2Key, uploadId, parts } = body as {
    videoId: string;
    r2Key: string;
    uploadId?: string;
    parts?: { PartNumber: number; ETag: string }[];
  };

  // Verify ownership
  const { data: video } = await supabase
    .from('videos')
    .select('id, user_id')
    .eq('id', videoId)
    .single();

  if (!video || video.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Complete multipart if needed
  if (uploadId && parts) {
    await completeMultipartUpload(r2Key, uploadId, parts);
  }

  // Update video status to 'uploaded' and store raw key
  await supabase
    .from('videos')
    .update({ status: 'uploaded', raw_key: r2Key })
    .eq('id', videoId);

  // TODO: Enqueue BullMQ transcoding job here
  // For now, we'll add this in Phase 2 when the worker is built
  // queue.add('transcode', { videoId, r2Key, userId: user.id });

  return NextResponse.json({ success: true });
}
