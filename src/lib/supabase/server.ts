import {createServerClient, type CookieOptions} from '@supabase/ssr';
import {createClient as createSupabaseClient} from '@supabase/supabase-js';
import {cookies} from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Server component / route handler client, scoped to the current request's
 * cookies and the anon key. Reads go through RLS as an anonymous user.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: {name: string; value: string; options: CookieOptions}[]) {
        try {
          cookiesToSet.forEach(({name, value, options}) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component without a mutable response - safe to ignore.
        }
      },
    },
  });
}

/**
 * Service role client for server-only admin reads/writes that must bypass RLS
 * (imports, matching queue, etc.). Never import this from client components.
 */
export function createServiceRoleClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {persistSession: false},
  });
}
