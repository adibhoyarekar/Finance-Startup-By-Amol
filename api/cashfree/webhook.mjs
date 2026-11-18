import { ORDER_ID_RE } from '../_lib/config.mjs';
import { verifyWebhookSignature } from '../_lib/cashfree.mjs';
import { sha256 } from '../_lib/crypto.mjs';
import { handle, json, log } from '../_lib/http.mjs';
import { K, syncOrder } from '../_lib/orders.mjs';
import { getStore } from '../_lib/store.mjs';

// The webhook only tells us which order changed. Its contents are never trusted:
// the order state is always re-read from Cashfree's API before anything is updated.
export const POST = handle(async (request) => {
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 64 * 1024) return json(413, { error: 'payload_too_large' });
  const signature = request.headers.get('x-webhook-signature');
  const timestamp = request.headers.get('x-webhook-timestamp');
  if (!verifyWebhookSignature(raw, signature, timestamp)) {
    log('warn', 'webhook_bad_signature', {});
    return json(401, { error: 'invalid_signature' });
  }

  let evt;
  try { evt = JSON.parse(raw); } catch { return json(400, { error: 'bad_json' }); }
  const data = (evt && evt.data) || {};
  const orderId = (data.order && data.order.order_id) || (data.refund && data.refund.order_id);
  if (typeof orderId !== 'string' || !ORDER_ID_RE.test(orderId)) return json(200, { ok: true, ignored: true });

  const store = getStore();
  const fingerprint = sha256([evt.type, orderId, data.payment && data.payment.cf_payment_id, data.payment && data.payment.payment_status, data.refund && data.refund.refund_status].join('|'));
  if (await store.get(K.evt(fingerprint))) return json(200, { ok: true, duplicate: true });

  const r = await syncOrder(store, orderId);
  if (r.busy) return json(503, { error: 'busy' }, { 'retry-after': '5' });
  if (!r.order) {
    log('warn', 'webhook_unknown_order', { orderId, type: evt.type });
    return json(200, { ok: true, unknown: true });
  }
  if (evt.type === 'PAYMENT_SUCCESS_WEBHOOK' && r.order.status === 'CREATED') {
    log('warn', 'webhook_success_not_yet_visible', { orderId });
    return json(503, { error: 'not_yet_visible' }, { 'retry-after': '30' });
  }
  await store.set(K.evt(fingerprint), '1', 7 * 86400);
  log('info', 'webhook_processed', { orderId, type: evt.type, status: r.order.status });
  return json(200, { ok: true });
});
