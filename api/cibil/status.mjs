import { ORDER_ID_RE } from '../_lib/config.mjs';
import { safeEqual, sha256 } from '../_lib/crypto.mjs';
import { rateLimit } from '../_lib/guard.mjs';
import { HttpError, clientIp, handle, json, readJson, requireSameOrigin } from '../_lib/http.mjs';
import { K, isSettled, loadOrder, publicView, syncOrder } from '../_lib/orders.mjs';
import { getStore } from '../_lib/store.mjs';

export const POST = handle(async (request) => {
  requireSameOrigin(request);
  const store = getStore();
  await rateLimit(store, `status-ip:${clientIp(request)}`, 120, 60);
  const body = await readJson(request, 1024);
  const id = typeof body.orderId === 'string' ? body.orderId : '';
  const token = typeof body.token === 'string' ? body.token : '';
  if (!ORDER_ID_RE.test(id) || !token || token.length > 128) throw new HttpError(404, 'not_found', 'Order not found.');

  let order = await loadOrder(store, id);
  if (!order || !safeEqual(order.tokenHash, sha256(token))) throw new HttpError(404, 'not_found', 'Order not found.');

  if (!isSettled(order) && (await store.setNX(K.sync(id), '1', 2))) {
    const r = await syncOrder(store, id);
    if (r.order) order = r.order;
  }
  return json(200, publicView(order));
});
