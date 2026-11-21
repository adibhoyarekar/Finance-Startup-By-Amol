import { handle, json, log } from '../_lib/http.mjs';

/* Public Supabase Auth settings for the browser.
   Only the project URL and the PUBLIC (anon / publishable) key are ever returned.
   If a secret / service_role key is put in SUPABASE_ANON_KEY by mistake, it is refused
   here so it can never reach a browser. */

const URL_RE = /^https:\/\/[a-z0-9]{20}\.supabase\.co$/;

function keyRole(key) {
  if (key.startsWith('sb_publishable_')) return 'anon';
  if (key.startsWith('sb_secret_')) return 'secret';
  const parts = key.split('.');
  if (parts.length !== 3) return 'unknown';
  try {
    const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    return payload && payload.role === 'anon' ? 'anon' : 'secret';
  } catch {
    return 'unknown';
  }
}

export function publicAuthConfig(env = process.env) {
  const url = String(env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const key = String(env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY || '').trim();
  if (!url || !key) return { configured: false };
  if (!URL_RE.test(url)) {
    log('error', 'supabase_url_invalid');
    return { configured: false };
  }
  if (keyRole(key) !== 'anon') {
    log('error', 'supabase_key_not_public', { hint: 'SUPABASE_ANON_KEY must be the anon / publishable key, never the service_role / secret key' });
    return { configured: false };
  }
  return { configured: true, url, key };
}

export const GET = handle(async () => {
  return json(200, publicAuthConfig());
});
