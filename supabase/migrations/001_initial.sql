-- Spool: Initial schema

-- Core videos table
create table public.videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text,
  description text,

  -- Recording metadata
  duration_seconds integer,
  recorded_at timestamptz default now(),
  source text check (source in ('desktop', 'extension', 'web')) not null,

  -- Storage
  raw_key text,
  hls_base_key text,
  thumbnail_key text,

  -- Processing state machine
  status text check (status in (
    'uploading',
    'uploaded',
    'transcoding',
    'transcribed',
    'ready',
    'error'
  )) default 'uploading' not null,
  processing_error text,
  processing_started_at timestamptz,
  processing_completed_at timestamptz,

  -- AI-generated content
  transcript text,
  transcript_srt text,
  auto_title text,
  auto_summary text,

  -- Sharing
  share_token text unique default encode(gen_random_bytes(8), 'hex'),
  is_public boolean default true,

  -- Editing (metadata-only trim)
  trim_start_ms integer default 0,
  trim_end_ms integer,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index idx_videos_share_token on public.videos(share_token);
create index idx_videos_user_id on public.videos(user_id);
create index idx_videos_status on public.videos(status);

-- RLS
alter table public.videos enable row level security;

create policy "owners_all" on public.videos
  for all using ((select auth.uid()) = user_id);

create policy "public_read" on public.videos
  for select using (is_public = true);

-- Upload sessions (multipart upload tracking)
create table public.upload_sessions (
  id uuid primary key default gen_random_uuid(),
  video_id uuid references public.videos(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  r2_upload_id text,
  r2_key text not null,
  parts jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create index idx_upload_sessions_video_id on public.upload_sessions(video_id);

alter table public.upload_sessions enable row level security;

create policy "owners_all" on public.upload_sessions
  for all using ((select auth.uid()) = user_id);

-- Enable realtime for processing status updates
alter publication supabase_realtime add table public.videos;

-- Auto-update updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger videos_updated_at
  before update on public.videos
  for each row execute function update_updated_at();

-- Service role function for worker to update processing status
create or replace function update_video_status(
  p_video_id uuid,
  p_status text,
  p_hls_base_key text default null,
  p_thumbnail_key text default null,
  p_transcript text default null,
  p_transcript_srt text default null,
  p_auto_title text default null,
  p_auto_summary text default null,
  p_duration_seconds integer default null,
  p_error text default null
) returns void
security definer
language plpgsql as $$
begin
  update public.videos
  set
    status = p_status,
    hls_base_key = coalesce(p_hls_base_key, hls_base_key),
    thumbnail_key = coalesce(p_thumbnail_key, thumbnail_key),
    transcript = coalesce(p_transcript, transcript),
    transcript_srt = coalesce(p_transcript_srt, transcript_srt),
    auto_title = coalesce(p_auto_title, auto_title),
    auto_summary = coalesce(p_auto_summary, auto_summary),
    duration_seconds = coalesce(p_duration_seconds, duration_seconds),
    processing_error = p_error,
    processing_started_at = case when p_status = 'transcoding' and processing_started_at is null then now() else processing_started_at end,
    processing_completed_at = case when p_status in ('ready', 'error') then now() else processing_completed_at end
  where id = p_video_id;
end;
$$;
