# Spool

Async screen recording for prosumers and small teams. Unwind from Loom.

Record your screen, camera, and mic. Get an instant share link. AI-generated transcripts, titles, and summaries.

## Architecture

```
┌──────────────┐  ┌──────────────┐
│ Tauri Desktop│  │ Chrome Ext   │  ← Two recorders, shared backend
│ (Rust+React) │  │ (MV3)        │
└──────┬───────┘  └──────┬───────┘
       └────────┬────────┘
                │ Upload (presigned URLs)
                ▼
       ┌────────────────┐
       │ Cloudflare R2  │ ← Zero egress costs
       └────────┬───────┘
                │ BullMQ job
                ▼
       ┌────────────────┐
       │ Worker (FFmpeg) │ ← HLS transcode + Deepgram + Groq
       └────────┬───────┘
                ▼
  ┌─────────────────────────┐
  │ Next.js + Supabase      │ ← Viewer, dashboard, auth, realtime
  └─────────────────────────┘
```

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ | [nvm](https://github.com/nvm-sh/nvm) |
| pnpm | 10+ | `npm install -g pnpm` |
| Docker | latest | [Docker Desktop](https://www.docker.com/products/docker-desktop/) |
| Supabase CLI | latest | `brew install supabase/tap/supabase` |
| FFmpeg | 6+ | `brew install ffmpeg` |
| Redis | any | `brew install redis` or use [Upstash](https://upstash.com) free tier |
| Rust | latest | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` (desktop app only) |

## Local Development Setup

### 1. Clone and install

```bash
git clone <repo-url> spool
cd spool
pnpm install
```

### 2. Start Supabase

```bash
npx supabase start
```

This starts a local Postgres, Auth, and Realtime server via Docker. Note the `anon key` and `service_role key` printed in the output — you'll need them next.

### 3. Configure environment

```bash
cp .env.example apps/web/.env
```

Edit `apps/web/.env` with the values from `supabase start`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase start>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase start>
NEXT_PUBLIC_R2_PUBLIC_URL=http://localhost:8787
NEXT_PUBLIC_APP_URL=http://localhost:3000
R2_ACCOUNT_ID=<your Cloudflare account ID>
R2_ACCESS_KEY_ID=<your R2 API token access key>
R2_SECRET_ACCESS_KEY=<your R2 API token secret>
R2_BUCKET_NAME=spool-videos
```

For R2 credentials, create a bucket and API token at [Cloudflare Dashboard > R2](https://dash.cloudflare.com/?to=/:account/r2).

### 4. Run the database migration

```bash
npx supabase db reset
```

This applies `supabase/migrations/001_initial.sql` which creates the `videos` table, RLS policies, and realtime subscriptions.

### 5. Start the web app

```bash
pnpm --filter @spool/web dev
```

Open [http://localhost:3000](http://localhost:3000). You should see the login page.

### 6. Start the worker (optional — needed for video processing)

Create a `worker/.env`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
R2_ACCOUNT_ID=<your Cloudflare account ID>
R2_ACCESS_KEY_ID=<your R2 access key>
R2_SECRET_ACCESS_KEY=<your R2 secret>
R2_BUCKET_NAME=spool-videos
REDIS_URL=redis://localhost:6379
DEEPGRAM_API_KEY=<your Deepgram API key>
GROQ_API_KEY=<your Groq API key>
```

Then:

```bash
redis-server &  # or use Upstash
pnpm --filter @spool/worker dev
```

API keys:
- Deepgram: [console.deepgram.com](https://console.deepgram.com) (free tier available)
- Groq: [console.groq.com](https://console.groq.com) (free tier available)

### 7. Build the Chrome extension (optional)

```bash
pnpm --filter @spool/extension build
```

Then load the unpacked extension from `apps/extension/dist` in `chrome://extensions` (enable Developer Mode).

### 8. Run the desktop app (optional — requires Rust)

```bash
cd apps/desktop
pnpm tauri dev
```

First run will compile Rust dependencies (~2-5 minutes).

## Project Structure

```
spool/
├── apps/
│   ├── web/            Next.js 15 — dashboard, viewer, upload API
│   ├── desktop/        Tauri 2 — macOS screen recorder
│   └── extension/      Chrome MV3 — tab/screen recorder
├── packages/
│   ├── db/             Supabase types and query helpers
│   ├── ui/             Shared Tailwind theme and CSS
│   └── config/         Shared TypeScript and env configs
├── worker/             BullMQ + FFmpeg transcoding service
└── supabase/           Database migrations
```

## Key Commands

| Command | Description |
|---------|-------------|
| `pnpm --filter @spool/web dev` | Start web app on :3000 |
| `pnpm --filter @spool/worker dev` | Start transcoding worker |
| `pnpm --filter @spool/extension build` | Build Chrome extension |
| `pnpm --filter @spool/web build` | Production build of web app |
| `npx supabase start` | Start local Supabase |
| `npx supabase db reset` | Reset DB and re-run migrations |
| `npx supabase gen types typescript --local > packages/db/src/generated.ts` | Regenerate DB types |

## How It Works

1. **Record** — Desktop app captures via FFmpeg/avfoundation. Extension captures via `chrome.tabCapture` + offscreen document.
2. **Upload** — Client gets a presigned R2 URL from `/api/upload/init`, uploads directly to R2, then calls `/api/upload/complete`.
3. **Share URL** — Available immediately on upload init (before processing starts). The viewer page shows a realtime processing status.
4. **Transcode** — Worker downloads from R2, runs FFmpeg to produce HLS (480p/720p/1080p), generates thumbnail and filmstrip.
5. **Transcribe** — Worker sends audio to Deepgram Nova-3, gets transcript + SRT captions.
6. **AI metadata** — Worker sends transcript to Groq for auto-title and summary.
7. **Play** — Viewer page uses hls.js (with Safari native fallback) to stream from R2. Trim is metadata-only, enforced client-side.
