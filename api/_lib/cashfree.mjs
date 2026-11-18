import { createHmac } from 'node:crypto';
import { cashfreeConfig } from './config.mjs';
import { safeEqual, randomHex } from './crypto.mjs';
import { HttpError } from './http.mjs';

export class GatewayError extends Error {
  constructor(status, code) {
    super(`cashfree ${status} ${code || ''}`.trim());
    this.status = status;
    this.code = code || '';
  }
}

export function cashfreeConfigured() {
  const c = cashfreeConfig();
  return Boolean(c.clientId && c.secret);
}

async function call(method, path, body) {
  const c = cashfreeConfig();
  if (!c.clientId || !c.secret) throw new HttpError(503, 'payments_unavailable', 'Payments are not available right now.');
  let res;
  try {
    res = await fetch(c.base + path, {
      method,
      headers: {
        'x-client-id': c.clientId,
        'x-client-secret': c.secret,
        'x-api-version': c.apiVersion,
        'x-request-id': randomHex(12),
        accept: 'application/json',
        ...(body ? { 'content-type': 'application/json' } : {})
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10000)
    });
  } catch (e) {
    throw new GatewayError(0, e && e.name === 'TimeoutError' ? 'timeout' : 'network');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new GatewayError(res.status, data && (data.code || data.type));
  return data;
}

const enc = encodeURIComponent;

export const createOrder = (order) => call('POST', '/orders', order);
export const getOrder = (orderId) => call('GET', `/orders/${enc(orderId)}`);
export const getPayments = (orderId) => call('GET', `/orders/${enc(orderId)}/payments`);
export const createRefund = (orderId, refund) => call('POST', `/orders/${enc(orderId)}/refunds`, refund);
export const getRefund = (orderId, refundId) => call('GET', `/orders/${enc(orderId)}/refunds/${enc(refundId)}`);

export function verifyWebhookSignature(rawBody, signature, timestamp) {
  const { secret } = cashfreeConfig();
  if (!secret || !signature || !timestamp) return false;
  const expected = createHmac('sha256', secret).update(timestamp + rawBody).digest('base64');
  return safeEqual(expected, signature);
}
