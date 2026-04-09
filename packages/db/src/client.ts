import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types.js';

export function createBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createSupabaseClient<Database>(supabaseUrl, supabaseKey);
}

export function createServerClient(serviceRole = false) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = serviceRole
    ? process.env.SUPABASE_SERVICE_ROLE_KEY!
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createSupabaseClient<Database>(supabaseUrl, key, {
    auth: serviceRole ? { persistSession: false, autoRefreshToken: false } : undefined,
  });
}
