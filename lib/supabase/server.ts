import { createClient as supabaseCreateClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/database';
import { cookies } from 'next/headers';

export function createServerClient() {
  const cookieStore = cookies();

  return supabaseCreateClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          cookie: cookieStore.toString(),
        },
      },
    }
  );
}
