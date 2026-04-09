import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProcessingState } from '@/components/player/processing-state';
import { Copy } from 'lucide-react';

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: video } = await supabase
    .from('videos')
    .select('*')
    .eq('share_token', token)
    .single();

  if (!video) notFound();

  const title = video.title || video.auto_title || 'Untitled recording';

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <span className="text-lg font-bold tracking-tight">Spool</span>
          <CopyLinkButton token={token} />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-xl font-semibold mb-4">{title}</h1>
        <ProcessingState initialVideo={video} />
      </main>
    </div>
  );
}

function CopyLinkButton({ token }: { token: string }) {
  return (
    <button
      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
      data-share-token={token}
      id="copy-link-btn"
    >
      <Copy className="h-3.5 w-3.5" />
      Copy link
    </button>
  );
}
