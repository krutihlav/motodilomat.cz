import 'server-only';
import {createClient, type SupabaseClient} from '@supabase/supabase-js';

/**
 * Interní náhled (nezveřejněná data přes service role) smí běžet jen mimo produkci
 * a jen se zapnutým SHOW_INTERNAL_PRODUCTS. Obě podmínky zároveň – pojistka proti
 * omylem zapnuté proměnné v produkci.
 */
export function isInternalPreview(): boolean {
  return (
    process.env.SHOW_INTERNAL_PRODUCTS === 'true' &&
    process.env.VERCEL_ENV !== 'production' &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

let cached: {sb: SupabaseClient; internal: boolean} | null = null;

/** Klient katalogu bez cookies (kvůli cache). Veřejně anon + RLS, v náhledu service role. */
export function catalogDb(): {sb: SupabaseClient; internal: boolean} {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const internal = isInternalPreview();
  const key = internal ? process.env.SUPABASE_SERVICE_ROLE_KEY! : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  cached = {sb: createClient(url, key, {auth: {persistSession: false}}), internal};
  return cached;
}
