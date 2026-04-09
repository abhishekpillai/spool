import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Video } from './types.js';

type Client = SupabaseClient<Database>;

export async function getVideoByShareToken(
  client: Client,
  shareToken: string,
): Promise<Video | null> {
  const { data, error } = await client
    .from('videos')
    .select('*')
    .eq('share_token', shareToken)
    .eq('is_public', true)
    .single();

  if (error) return null;
  return data;
}

export async function getVideoById(
  client: Client,
  videoId: string,
): Promise<Video | null> {
  const { data, error } = await client
    .from('videos')
    .select('*')
    .eq('id', videoId)
    .single();

  if (error) return null;
  return data;
}

export async function getUserVideos(
  client: Client,
  userId: string,
): Promise<Video[]> {
  const { data, error } = await client
    .from('videos')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data;
}

export async function updateVideo(
  client: Client,
  videoId: string,
  updates: Partial<Video>,
): Promise<Video | null> {
  const { data, error } = await client
    .from('videos')
    .update(updates)
    .eq('id', videoId)
    .select()
    .single();

  if (error) return null;
  return data;
}

export async function deleteVideo(
  client: Client,
  videoId: string,
): Promise<boolean> {
  const { error } = await client
    .from('videos')
    .delete()
    .eq('id', videoId);

  return !error;
}
