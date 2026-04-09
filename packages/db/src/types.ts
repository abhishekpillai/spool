// Auto-generated types will be placed here by `supabase gen types typescript`
// For now, define the schema manually to unblock development

export type VideoStatus =
  | 'uploading'
  | 'uploaded'
  | 'transcoding'
  | 'transcribed'
  | 'ready'
  | 'error';

export type VideoSource = 'desktop' | 'extension' | 'web';

export interface Video {
  id: string;
  user_id: string;
  title: string | null;
  description: string | null;
  duration_seconds: number | null;
  recorded_at: string;
  source: VideoSource;
  raw_key: string | null;
  hls_base_key: string | null;
  thumbnail_key: string | null;
  status: VideoStatus;
  processing_error: string | null;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  transcript: string | null;
  transcript_srt: string | null;
  auto_title: string | null;
  auto_summary: string | null;
  share_token: string;
  is_public: boolean;
  trim_start_ms: number;
  trim_end_ms: number | null;
  created_at: string;
  updated_at: string;
}

export interface UploadSession {
  id: string;
  video_id: string;
  user_id: string;
  r2_upload_id: string | null;
  r2_key: string;
  parts: { partNumber: number; etag: string }[];
  created_at: string;
}

// Database type matching Supabase generated format
export interface Database {
  public: {
    Tables: {
      videos: {
        Row: Video;
        Insert: Omit<Video, 'id' | 'created_at' | 'updated_at' | 'share_token' | 'recorded_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          share_token?: string;
          recorded_at?: string;
        };
        Update: Partial<Video>;
      };
      upload_sessions: {
        Row: UploadSession;
        Insert: Omit<UploadSession, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<UploadSession>;
      };
    };
  };
}
