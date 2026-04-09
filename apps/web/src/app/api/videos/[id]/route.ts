import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deleteR2Objects, deleteR2Prefix } from '@/lib/r2';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const allowedFields = ['title', 'description', 'trim_start_ms', 'trim_end_ms', 'is_public'];
  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) updates[field] = body[field];
  }

  const { data, error } = await supabase
    .from('videos')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 400 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get video to find R2 keys
  const { data: video } = await supabase
    .from('videos')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!video) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Delete R2 objects
  const keysToDelete: string[] = [];
  if (video.raw_key) keysToDelete.push(video.raw_key);
  if (video.thumbnail_key) keysToDelete.push(video.thumbnail_key);
  if (keysToDelete.length > 0) await deleteR2Objects(keysToDelete);
  if (video.hls_base_key) await deleteR2Prefix(video.hls_base_key);

  // Delete DB row (cascade deletes upload_sessions)
  await supabase.from('videos').delete().eq('id', id);

  return NextResponse.json({ success: true });
}
