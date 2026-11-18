import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { HttpError } from './http.mjs';

let cached = null;

function keys() {
  const raw = process.env.DATA_ENC_KEY || '';
  if (cached && cached.raw === raw) return cached;
  const master = Buffer.from(raw, 'base64');
  if (master.length !== 32) throw new HttpError(503, 'payments_unavailable', 'Payments are not available right now.');
  cached = {
    raw,
    enc: Buffer.from(hkdfSync('sha256', master, Buffer.alloc(0), 'credmates-enc-v1', 32)),
    mac: Buffer.from(hkdfSync('sha256', master, Buffer.alloc(0), 'credmates-mac-v1', 32))
  };
  return cached;
}

export function hasDataKey() {
  try { keys(); return true; } catch { return false; }
}

export function encrypt(text) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', keys().enc, iv);
  const ct = Buffer.concat([c.update(String(text), 'utf8'), c.final()]);
  return 'v1.' + Buffer.concat([iv, c.getAuthTag(), ct]).toString('base64url');
}

export function decrypt(blob) {
  const buf = Buffer.from(String(blob).slice(3), 'base64url');
  const d = createDecipheriv('aes-256-gcm', keys().enc, buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString('utf8');
}

export function sha256(s) {
  return createHash('sha256').update(String(s)).digest('hex');
}

export function keyedHash(s) {
  return createHmac('sha256', keys().mac).update(String(s)).digest('hex');
}

export function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

export function randomHex(bytes) {
  return randomBytes(bytes).toString('hex');
}

export function randomToken() {
  return randomBytes(32).toString('base64url');
}
