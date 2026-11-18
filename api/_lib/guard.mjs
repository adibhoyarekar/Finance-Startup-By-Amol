import { HttpError, log } from './http.mjs';

export async function rateLimit(store, key, limit, windowS) {
  const bucket = Math.floor(Date.now() / 1000 / windowS);
  const n = await store.incrWindow(`cm:rl:${key}:${bucket}`, windowS);
  if (n > limit) {
    const retry = windowS - (Math.floor(Date.now() / 1000) % windowS);
    throw new HttpError(429, 'rate_limited', 'Too many attempts. Please wait a few minutes and try again.', { headers: { 'retry-after': String(retry) } });
  }
}

export function turnstileEnabled() {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

export async function verifyTurnstile(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return;
  if (typeof token !== 'string' || !token || token.length > 2048) {
    throw new HttpError(403, 'security_check_failed', 'Please complete the security check and try again.');
  }
  let data = null;
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, ...(ip && ip !== 'unknown' ? { remoteip: ip } : {}) }),
      signal: AbortSignal.timeout(5000)
    });
    data = await res.json().catch(() => null);
  } catch {
    throw new HttpError(503, 'security_check_unavailable', 'Security check is unavailable. Please try again in a moment.');
  }
  if (!data || data.success !== true) {
    log('warn', 'turnstile_rejected', { codes: data && data['error-codes'] });
    throw new HttpError(403, 'security_check_failed', 'Please complete the security check and try again.');
  }
}
