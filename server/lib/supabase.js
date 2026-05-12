import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!url || !serviceKey || !publishableKey) {
  throw new Error(
    'Missing SUPABASE_URL / SUPABASE_SECRET_KEY / SUPABASE_PUBLISHABLE_KEY in server/.env',
  );
}

// Service-role client — bypasses RLS. Use ONLY on the server.
export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Publishable-key client — used for verifying user tokens, MFA, etc.
export const supabaseAuth = createClient(url, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const SUPABASE_URL = url;
