import { allowedHosts } from './config.mjs';

const BASE_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store, max-age=0',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'x-frame-options': 'DENY'
};

export class HttpError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export function json(status, body, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...BASE_HEADERS, ...headers } });
}

export function log(level, msg, data = {}) {
  const line = JSON.stringify({ level, msg, ...data, at: new Date().toISOString() });
  if (level === 'error') console.error(line); else console.log(line);
}

export function handle(fn) {
  return async (request) => {
    try {
      return await fn(request);
    } catch (e) {
      if (e instanceof HttpError) {
        const { headers, ...rest } = e.extra;
        return json(e.status, { error: e.code, message: e.message, ...rest }, headers);
      }
      log('error', 'unhandled_error', { name: e && e.name, err: e && e.message });
      return json(500, { error: 'server_error', message: 'Something went wrong. Please try again.' });
    }
  };
}

export function requireSameOrigin(request) {
  const origin = request.headers.get('origin');
  let host = '';
  try { host = origin ? new URL(origin).host : ''; } catch { host = ''; }
  if (!host || !allowedHosts(request).has(host)) {
    throw new HttpError(403, 'forbidden_origin', 'This request is not allowed.');
  }
}

export async function readJson(request, maxBytes = 4096) {
  const type = request.headers.get('content-type') || '';
  if (!type.toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, 'unsupported_media_type', 'Send the request as JSON.');
  }
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > maxBytes) throw new HttpError(413, 'payload_too_large', 'Request is too large.');
  const text = await request.text();
  if (Buffer.byteLength(text) > maxBytes) throw new HttpError(413, 'payload_too_large', 'Request is too large.');
  let body;
  try { body = JSON.parse(text); } catch { throw new HttpError(400, 'bad_json', 'Request could not be read.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'bad_json', 'Request could not be read.');
  return body;
}

export function clientIp(request) {
  // Only trust Cloudflare's header when the site is actually proxied through Cloudflare; otherwise anyone could forge it.
  const cf = process.env.TRUST_CF_CONNECTING_IP === '1' && request.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  const real = request.headers.get('x-real-ip');
  if (real) return real.trim();
  const fwd = request.headers.get('x-forwarded-for');
  return fwd ? fwd.split(',')[0].trim() : 'unknown';
}
