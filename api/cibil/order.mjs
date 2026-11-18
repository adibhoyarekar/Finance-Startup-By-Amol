import { PRODUCTS, cashfreeConfig, siteUrl } from '../_lib/config.mjs';
import { createOrder } from '../_lib/cashfree.mjs';
import { keyedHash } from '../_lib/crypto.mjs';
import { rateLimit, verifyTurnstile } from '../_lib/guard.mjs';
import { HttpError, clientIp, handle, json, log, readJson, requireSameOrigin } from '../_lib/http.mjs';
import { K, newOrder, saveOrder } from '../_lib/orders.mjs';
import { getStore } from '../_lib/store.mjs';
import { validateOrderInput } from '../_lib/validate.mjs';

export const POST = handle(async (request) => {
  requireSameOrigin(request);
  const store = getStore();
  const ip = clientIp(request);
  await rateLimit(store, `order-ip:${ip}`, 10, 600);
  await rateLimit(store, 'order-all', Number(process.env.ORDER_GLOBAL_LIMIT_PER_10MIN) || 300, 600);
  const body = await readJson(request);
  const input = validateOrderInput(body);
  const phoneKey = keyedHash('phone:' + input.phone);
  await rateLimit(store, `order-phone:${phoneKey.slice(0, 32)}`, 6, 3600);
  await verifyTurnstile(body.turnstileToken, ip);

  const site = siteUrl(request);
  if (!site) throw new HttpError(503, 'payments_unavailable', 'Payments are not available right now.');

  const { order, token } = newOrder(input);
  await saveOrder(store, order);

  let cf;
  try {
    cf = await createOrder({
      order_id: order.id,
      order_amount: order.amount,
      order_currency: 'INR',
      customer_details: {
        customer_id: 'c_' + keyedHash('customer:' + input.phone).slice(0, 32),
        customer_phone: input.phone,
        customer_name: input.name
      },
      order_meta: {
        return_url: `${site}/cibil-score.html?order_id={order_id}`,
        ...(site.startsWith('https://') ? { notify_url: `${site}/api/cashfree/webhook` } : {})
      },
      order_expiry_time: new Date(order.expiresAt).toISOString(),
      order_note: PRODUCTS[input.bureau].label,
      order_tags: { product: input.bureau }
    });
  } catch (e) {
    order.status = 'CREATE_FAILED';
    await saveOrder(store, order);
    log('error', 'order_create_failed', { orderId: order.id, status: e && e.status, code: e && e.code });
    throw new HttpError(502, 'gateway_error', 'Could not start the payment. Please try again.');
  }
  if (!cf || cf.order_id !== order.id || !cf.payment_session_id) {
    order.status = 'CREATE_FAILED';
    await saveOrder(store, order);
    log('error', 'order_create_bad_response', { orderId: order.id });
    throw new HttpError(502, 'gateway_error', 'Could not start the payment. Please try again.');
  }

  await store.zadd(K.pending, Date.now(), order.id);
  log('info', 'order_created', { orderId: order.id, bureau: order.bureau, amount: order.amount });
  return json(201, {
    orderId: order.id,
    accessToken: token,
    paymentSessionId: cf.payment_session_id,
    mode: cashfreeConfig().mode,
    amount: order.amount,
    expiresAt: order.expiresAt
  });
});
