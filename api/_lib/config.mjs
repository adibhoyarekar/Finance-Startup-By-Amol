export const PRODUCTS = {
  crif: { label: 'CRIF CIBIL', amount: 149 },
  transunion: { label: 'TransUnion CIBIL', amount: 199 },
  both: { label: 'Both Reports (CRIF + TransUnion)', amount: 299 }
};

export const ORDER_ID_RE = /^cm_[a-f0-9]{24}$/;
export const ORDER_TTL_S = 60 * 60 * 24 * 30;
export const CHECKOUT_WINDOW_MS = 30 * 60 * 1000;

export function isProd() {
  return process.env.VERCEL_ENV === 'production';
}

export function cashfreeConfig() {
  const mode = process.env.CASHFREE_ENV === 'production' ? 'production' : 'sandbox';
  return {
    mode,
    base: mode === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg',
    clientId: process.env.CASHFREE_CLIENT_ID || '',
    secret: process.env.CASHFREE_CLIENT_SECRET || '',
    apiVersion: '2025-01-01'
  };
}

export function siteUrl(request) {
  const fixed = (process.env.SITE_URL || '').replace(/\/+$/, '');
  if (fixed) return fixed;
  if (isProd()) return '';
  return new URL(request.url).origin;
}

export function allowedHosts(request) {
  const hosts = new Set([new URL(request.url).host]);
  const add = (u) => { try { hosts.add(new URL(u).host); } catch { /* ignore bad entries */ } };
  if (process.env.SITE_URL) add(process.env.SITE_URL);
  (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean).forEach(add);
  return hosts;
}
