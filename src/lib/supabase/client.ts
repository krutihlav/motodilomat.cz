import {createBrowserClient} from '@supabase/ssr';

/** Public (anon key) client for client components. Only reads public data. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
