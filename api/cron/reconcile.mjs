import { safeEqual } from '../_lib/crypto.mjs';
import { handle, json, log } from '../_lib/http.mjs';
import { K, isSettled, syncOrder } from '../_lib/orders.mjs';
import { getStore } from '../_lib/store.mjs';

export const GET = handle(async (request) => {
  const secret = process.env.CRON_SECRET || '';
  const auth = request.headers.get('authorization') || '';
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) return json(401, { error: 'unauthorized' });

  const store = getStore();
  const ids = await store.zrangeByScore(K.pending, Date.now() - 2 * 60e3, 50);
  const summary = { checked: 0, settled: 0, failed: 0 };
  for (const id of ids) {
    try {
      const r = await syncOrder(store, id);
      summary.checked += 1;
      if (!r.order) await store.zrem(K.pending, id);
      else if (isSettled(r.order)) { await store.zrem(K.pending, id); summary.settled += 1; }
    } catch (e) {
      summary.failed += 1;
      log('error', 'reconcile_failed', { orderId: id, err: e && e.message });
    }
  }
  log('info', 'reconcile_done', summary);
  return json(200, summary);
});
