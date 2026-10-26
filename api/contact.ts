import type {VercelRequest, VercelResponse} from '@vercel/node';
import {createClient} from '@supabase/supabase-js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KINDS = new Set(['fix', 'feed', 'remove', 'other']);

/** Formulář /pro-eshopy → tabulka contact_messages (jen service role, migrace 024). */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({error: 'Method not allowed'});
    return;
  }

  const body = (typeof req.body === 'string' ? safeParseJson(req.body) : req.body) as Record<string, unknown> | null;
  const {kind, shop_url: shopUrl, email, message, company} = body ?? {};

  // Honeypot: robot vyplnil skryté pole – tváříme se, že je vše v pořádku.
  if (typeof company === 'string' && company.trim().length > 0) {
    res.status(200).json({ok: true});
    return;
  }

  if (typeof email !== 'string' || email.length > 254 || !EMAIL_REGEX.test(email.trim())) {
    res.status(400).json({error: 'Invalid email'});
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    res.status(500).json({error: 'Server misconfigured'});
    return;
  }

  const supabase = createClient(supabaseUrl, serviceKey, {auth: {persistSession: false}});
  const {error} = await supabase.from('contact_messages').insert({
    kind: typeof kind === 'string' && KINDS.has(kind) ? kind : 'other',
    shop_url: typeof shopUrl === 'string' && shopUrl.trim() ? shopUrl.trim().slice(0, 300) : null,
    email: email.trim().toLowerCase(),
    message: typeof message === 'string' && message.trim() ? message.trim().slice(0, 4000) : null,
  });

  if (error) {
    console.error('Failed to insert contact message', error);
    res.status(500).json({error: 'Server error'});
    return;
  }
  res.status(200).json({ok: true});
}

function safeParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
