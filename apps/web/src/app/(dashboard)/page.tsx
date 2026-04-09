import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { VideoGrid } from '@/components/dashboard/video-grid';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: videos } = await supabase
    .from('videos')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your Videos</h1>
          <p className="text-muted-foreground">Record, share, and manage your screen recordings.</p>
        </div>
      </div>
      <VideoGrid videos={videos ?? []} />
    </div>
  );
}
