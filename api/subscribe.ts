import type {VercelRequest, VercelResponse} from '@vercel/node';
import {createClient} from '@supabase/supabase-js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({error: 'Method not allowed'});
    return;
  }

  const body = typeof req.body === 'string' ? safeParseJson(req.body) : req.body;
  const {email, company, source, consent_text: consentText} = body ?? {};

  // Honeypot: bot filled in the hidden field, pretend success without storing anything.
  if (typeof company === 'string' && company.trim().length > 0) {
    res.status(200).json({ok: true});
    return;
  }

  if (typeof email !== 'string') {
    res.status(400).json({error: 'Invalid email'});
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail.length === 0 || normalizedEmail.length > MAX_EMAIL_LENGTH || !EMAIL_REGEX.test(normalizedEmail)) {
    res.status(400).json({error: 'Invalid email'});
    return;
  }

  if (typeof consentText !== 'string' || consentText.trim().length === 0) {
    res.status(400).json({error: 'Missing consent'});
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    res.status(500).json({error: 'Server misconfigured'});
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {persistSession: false},
  });

  const {error} = await supabase.from('waitlist').upsert(
    {
      email: normalizedEmail,
      source: typeof source === 'string' ? source : 'coming-soon',
      consent_text: consentText,
    },
    {onConflict: 'email', ignoreDuplicates: true},
  );

  if (error) {
    console.error('Failed to insert waitlist entry', error);
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
