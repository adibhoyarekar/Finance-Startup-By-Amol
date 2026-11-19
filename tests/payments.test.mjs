import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomBytes } from 'node:crypto';

process.env.CM_STORE = 'memory';
process.env.DATA_ENC_KEY = randomBytes(32).toString('base64');
process.env.CASHFREE_CLIENT_ID = 'test_id';
process.env.CASHFREE_CLIENT_SECRET = 'test_secret';
process.env.SITE_URL = 'https://credmates.test';
process.env.CRON_SECRET = 'cron_test_secret';
delete process.env.VERCEL_ENV;
delete process.env.TURNSTILE_SECRET_KEY;

const { resetStoreForTests, getStore } = await import('../api/_lib/store.mjs');
const { setReportProvider } = await import('../api/_lib/bureau.mjs');
const { GET: configGET } = await import('../api/cibil/config.mjs');
const { POST: orderPOST } = await import('../api/cibil/order.mjs');
const { POST: statusPOST } = await import('../api/cibil/status.mjs');
const { POST: webhookPOST } = await import('../api/cashfree/webhook.mjs');
const { GET: cronGET } = await import('../api/cron/reconcile.mjs');
const { loadOrder } = await import('../api/_lib/orders.mjs');

// ---- fake Cashfree + Turnstile ----
let cf;
const realFetch = globalThis.fetch;
function resetFake() {
  cf = { orders: new Map(), payments: new Map(), refunds: new Map(), calls: [], failCreate: false, refundStatus: 'PENDING', turnstileOk: true, amountOverride: null };
}
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(String(url));
  const method = init.method || 'GET';
  const body = init.body && typeof init.body === 'string' ? JSON.parse(init.body) : null;
  cf.calls.push({ method, path: u.pathname, body, headers: init.headers });
  const ok = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
  if (u.host === 'challenges.cloudflare.com') return ok({ success: cf.turnstileOk });
  if (u.host !== 'sandbox.cashfree.com') return realFetch(url, init);
  assert.equal(init.headers['x-client-id'], 'test_id');
  assert.equal(init.headers['x-api-version'], '2025-01-01');
  let m;
  if (method === 'POST' && u.pathname === '/pg/orders') {
    if (cf.failCreate) return ok({ code: 'request_failed' }, 500);
    cf.orders.set(body.order_id, { ...body, order_status: 'ACTIVE' });
    cf.payments.set(body.order_id, []);
    return ok({ order_id: body.order_id, cf_order_id: 1, payment_session_id: 'session_' + body.order_id, order_status: 'ACTIVE' });
  }
  if ((m = u.pathname.match(/^\/pg\/orders\/([^/]+)$/)) && method === 'GET') {
    const o = cf.orders.get(m[1]);
    if (!o) return ok({ code: 'order_not_found' }, 404);
    return ok({ ...o, order_amount: cf.amountOverride ?? o.order_amount });
  }
  if ((m = u.pathname.match(/^\/pg\/orders\/([^/]+)\/payments$/))) return ok(cf.payments.get(m[1]) || []);
  if ((m = u.pathname.match(/^\/pg\/orders\/([^/]+)\/refunds$/)) && method === 'POST') {
    if (cf.refunds.has(body.refund_id)) return ok({ code: 'refund_already_exists' }, 409);
    cf.refunds.set(body.refund_id, { ...body, refund_status: cf.refundStatus });
    return ok({ refund_id: body.refund_id, cf_refund_id: 9, refund_status: cf.refundStatus });
  }
  if ((m = u.pathname.match(/^\/pg\/orders\/([^/]+)\/refunds\/([^/]+)$/))) return ok(cf.refunds.get(m[2]));
  return ok({ code: 'not_found' }, 404);
};

function pay(orderId, { status = 'SUCCESS', amount } = {}) {
  const o = cf.orders.get(orderId);
  cf.payments.get(orderId).push({ cf_payment_id: 5550001 + cf.payments.get(orderId).length, payment_status: status, payment_amount: amount ?? o.order_amount, payment_currency: 'INR', payment_time: new Date().toISOString(), payment_group: 'upi' });
  if (status === 'SUCCESS') o.order_status = 'PAID';
}

// ---- request helpers ----
const ORIGIN = 'https://credmates.test';
let ipCounter = 0;
function req(path, body, { origin = ORIGIN, type = 'application/json', ip, headers = {}, method = 'POST' } = {}) {
  return new Request('https://credmates.test' + path, {
    method,
    headers: { ...(type ? { 'content-type': type } : {}), ...(origin ? { origin } : {}), 'x-real-ip': ip || `10.0.0.${++ipCounter}`, ...headers },
    body: method === 'GET' ? undefined : typeof body === 'string' ? body : JSON.stringify(body)
  });
}
const VALID = { bureau: 'crif', name: 'Rahul Sharma', pan: 'ABCPE1234F', phone: '9876543210', gender: 'male', consent: true };
let phoneN = 0;
function details(extra = {}) {
  phoneN += 1;
  return { ...VALID, phone: '98' + String(10000000 + phoneN).slice(-8), ...extra };
}
async function createOrder(extra = {}, opts) {
  const res = await orderPOST(req('/api/cibil/order', details(extra), opts));
  return { res, body: await res.json() };
}
async function status(orderId, token) {
  await getStore().del(`cm:sync:${orderId}`);
  const res = await statusPOST(req('/api/cibil/status', { orderId, token }));
  return { res, body: await res.json() };
}
function signed(payload) {
  const raw = JSON.stringify(payload);
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = createHmac('sha256', 'test_secret').update(ts + raw).digest('base64');
  return new Request('https://credmates.test/api/cashfree/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'x-webhook-signature': sig, 'x-webhook-timestamp': ts }, body: raw });
}

beforeEach(() => {
  resetStoreForTests();
  resetFake();
  setReportProvider(async () => ({ sample: true }));
});

// ---- tests ----
test('config reports enabled sandbox checkout', async () => {
  const j = await (await configGET(new Request('https://credmates.test/api/cibil/config'))).json();
  assert.deepEqual(j, { enabled: true, mode: 'sandbox', turnstileSiteKey: null });
});

test('price is set by the server, not the browser', async () => {
  const { res, body } = await createOrder({ bureau: 'transunion', amount: 1, order_amount: 1 });
  assert.equal(res.status, 201);
  assert.equal(body.amount, 199);
  assert.equal(cf.orders.get(body.orderId).order_amount, 199);
  assert.match(body.orderId, /^cm_[a-f0-9]{24}$/);
  assert.ok(body.accessToken.length >= 40);
  const sent = cf.calls.find((c) => c.path === '/pg/orders').body;
  assert.equal(sent.order_meta.notify_url, 'https://credmates.test/api/cashfree/webhook');
  assert.equal(sent.order_meta.return_url, 'https://credmates.test/cibil-score.html?order_id={order_id}');
  assert.ok(!JSON.stringify(sent).includes('ABCPE1234F'), 'PAN must not be sent to the gateway');
});

test('gender is required for TransUnion and Both, optional for CRIF', async () => {
  for (const bureau of ['transunion', 'both']) {
    for (const gender of [undefined, '', 'other', 'M', 5]) {
      const { res, body } = await createOrder({ bureau, gender });
      assert.equal(res.status, 422, bureau + ' ' + gender);
      assert.ok(body.fields.gender);
    }
    assert.equal((await createOrder({ bureau, gender: 'female' })).res.status, 201);
  }
  assert.equal((await createOrder({ bureau: 'crif', gender: undefined })).res.status, 201);
});

test('PAN, name and phone are encrypted at rest', async () => {
  const { body } = await createOrder();
  const raw = await getStore().get(`cm:order:${body.orderId}`);
  assert.ok(!raw.includes('ABCPE1234F') && !raw.includes('Rahul'));
  assert.ok(raw.includes('ABCPE****F'));
});

test('invalid input is rejected with field errors', async () => {
  for (const [bad, field] of [[{ bureau: 'gold' }, 'bureau'], [{ pan: 'ABCDE1234F' }, 'pan'], [{ pan: 'abc' }, 'pan'], [{ phone: '1234567890' }, 'phone'], [{ name: 'R' }, 'name'], [{ name: '<script>x</script>' }, 'name'], [{ consent: 'yes' }, 'consent'], [{ bureau: '__proto__' }, 'bureau']]) {
    const { res, body } = await createOrder(bad);
    assert.equal(res.status, 422, JSON.stringify(bad));
    assert.ok(body.fields[field], field);
  }
  assert.equal(cf.orders.size, 0);
});

test('cross-site, missing origin, wrong content type, bad JSON and oversized bodies are refused', async () => {
  assert.equal((await orderPOST(req('/api/cibil/order', details(), { origin: 'https://evil.test' }))).status, 403);
  assert.equal((await orderPOST(req('/api/cibil/order', details(), { origin: null }))).status, 403);
  assert.equal((await orderPOST(req('/api/cibil/order', details(), { type: 'text/plain' }))).status, 415);
  assert.equal((await orderPOST(req('/api/cibil/order', '{bad'))).status, 400);
  assert.equal((await orderPOST(req('/api/cibil/order', '[1,2]'))).status, 400);
  assert.equal((await orderPOST(req('/api/cibil/order', { ...details(), pad: 'x'.repeat(5000) }))).status, 413);
});

test('order creation is rate limited per IP and per phone', async () => {
  let last;
  for (let i = 0; i < 11; i++) last = await orderPOST(req('/api/cibil/order', details(), { ip: '1.2.3.4' }));
  assert.equal(last.status, 429);
  assert.ok(last.headers.get('retry-after'));
  for (let i = 0; i < 7; i++) last = await orderPOST(req('/api/cibil/order', { ...VALID, phone: '9000000001' }));
  assert.equal(last.status, 429);
});

test('gateway failure returns a clean error and nothing is charged', async () => {
  cf.failCreate = true;
  const { res, body } = await createOrder();
  assert.equal(res.status, 502);
  assert.equal(body.error, 'gateway_error');
  assert.ok(!('stack' in body));
});

test('status needs the private token (no access by order ID alone)', async () => {
  const { body } = await createOrder();
  assert.equal((await status(body.orderId, 'wrong')).res.status, 404);
  assert.equal((await status('cm_000000000000000000000000', body.accessToken)).res.status, 404);
  assert.equal((await status('../etc', body.accessToken)).res.status, 404);
});

test('happy path: unpaid -> pending -> paid and report ready', async () => {
  const { body: o } = await createOrder({ bureau: 'both' });
  let s = await status(o.orderId, o.accessToken);
  assert.equal(s.body.state, 'AWAITING_PAYMENT');
  assert.equal(s.body.report, null);

  pay(o.orderId, { status: 'PENDING' });
  s = await status(o.orderId, o.accessToken);
  assert.equal(s.body.state, 'PENDING');

  pay(o.orderId, { status: 'SUCCESS' });
  s = await status(o.orderId, o.accessToken);
  assert.equal(s.body.state, 'READY');
  assert.equal(s.body.amount, 250);
  assert.equal(s.body.payment.method, 'UPI');
  assert.equal(s.body.payment.id, '5550002');
  assert.equal(s.body.customer.pan, 'ABCPE****F');
  assert.equal(s.body.customer.name, 'Rahul Sharma');
  assert.ok(s.body.customer.phone.includes('******'));
  assert.deepEqual(s.body.report, { sample: true });
});

test('a closed payment window leaves the order unpaid and retryable', async () => {
  const { body: o } = await createOrder();
  pay(o.orderId, { status: 'USER_DROPPED' });
  const s = await status(o.orderId, o.accessToken);
  assert.equal(s.body.state, 'AWAITING_PAYMENT');
  assert.equal(s.body.attempt, 'USER_DROPPED');
});

test('failed then successful retry on the same order', async () => {
  const { body: o } = await createOrder();
  pay(o.orderId, { status: 'FAILED' });
  assert.equal((await status(o.orderId, o.accessToken)).body.attempt, 'FAILED');
  pay(o.orderId, { status: 'SUCCESS' });
  assert.equal((await status(o.orderId, o.accessToken)).body.state, 'READY');
});

test('expired checkout session shows as expired', async () => {
  const { body: o } = await createOrder();
  cf.orders.get(o.orderId).order_status = 'EXPIRED';
  assert.equal((await status(o.orderId, o.accessToken)).body.state, 'EXPIRED');
});

test('amount tampering at the gateway is caught and never delivered', async () => {
  const { body: o } = await createOrder();
  pay(o.orderId, { amount: 1 });
  let s = await status(o.orderId, o.accessToken);
  assert.equal(s.body.state, 'REVIEW');
  assert.equal(s.body.report, null);

  const { body: o2 } = await createOrder();
  pay(o2.orderId);
  cf.amountOverride = 1;
  s = await status(o2.orderId, o2.accessToken);
  assert.equal(s.body.state, 'REVIEW');
});

test('webhook: bad or missing signature is rejected', async () => {
  const { body: o } = await createOrder();
  const good = signed({ type: 'PAYMENT_SUCCESS_WEBHOOK', data: { order: { order_id: o.orderId } } });
  const raw = await good.clone().text();
  const forged = new Request(good.url, { method: 'POST', headers: { 'x-webhook-signature': 'AAAA', 'x-webhook-timestamp': good.headers.get('x-webhook-timestamp') }, body: raw });
  assert.equal((await webhookPOST(forged)).status, 401);
  const tampered = new Request(good.url, { method: 'POST', headers: { 'x-webhook-signature': good.headers.get('x-webhook-signature'), 'x-webhook-timestamp': good.headers.get('x-webhook-timestamp') }, body: raw.replace('SUCCESS', 'FAILED') });
  assert.equal((await webhookPOST(tampered)).status, 401);
  assert.equal((await webhookPOST(new Request(good.url, { method: 'POST', body: raw }))).status, 401);
});

test('webhook: a forged "paid" event cannot mark an unpaid order as paid', async () => {
  const { body: o } = await createOrder();
  const res = await webhookPOST(signed({ type: 'PAYMENT_SUCCESS_WEBHOOK', data: { order: { order_id: o.orderId, order_amount: 99 }, payment: { cf_payment_id: 1, payment_status: 'SUCCESS' } } }));
  assert.equal(res.status, 503, 'asks Cashfree to retry until its API shows the payment');
  assert.equal((await loadOrder(getStore(), o.orderId)).status, 'CREATED');
});

test('webhook confirms payment even if the customer closed the tab, and duplicates are skipped', async () => {
  const { body: o } = await createOrder();
  pay(o.orderId);
  const evt = { type: 'PAYMENT_SUCCESS_WEBHOOK', data: { order: { order_id: o.orderId }, payment: { cf_payment_id: 5550001, payment_status: 'SUCCESS' } } };
  assert.equal((await webhookPOST(signed(evt))).status, 200);
  const saved = await loadOrder(getStore(), o.orderId);
  assert.equal(saved.status, 'PAID');
  assert.equal(saved.fulfil, 'DONE');
  const dup = await (await webhookPOST(signed(evt))).json();
  assert.equal(dup.duplicate, true);
  const unknown = await (await webhookPOST(signed({ type: 'PAYMENT_SUCCESS_WEBHOOK', data: { order: { order_id: 'someone_else_123' } } }))).json();
  assert.equal(unknown.ignored, true);
});

test('webhook asks for a retry while another check holds the order lock', async () => {
  const { body: o } = await createOrder();
  pay(o.orderId);
  await getStore().setNX(`cm:lock:${o.orderId}`, 'other', 30);
  const res = await webhookPOST(signed({ type: 'PAYMENT_SUCCESS_WEBHOOK', data: { order: { order_id: o.orderId } } }));
  assert.equal(res.status, 503);
});

test('concurrent status checks fulfil the report exactly once', async () => {
  let calls = 0;
  setReportProvider(async () => { calls += 1; await new Promise((r) => setTimeout(r, 30)); return { sample: true }; });
  const { body: o } = await createOrder();
  pay(o.orderId);
  await Promise.all([1, 2, 3, 4, 5].map(() => statusPOST(req('/api/cibil/status', { orderId: o.orderId, token: o.accessToken }))));
  await webhookPOST(signed({ type: 'PAYMENT_SUCCESS_WEBHOOK', data: { order: { order_id: o.orderId } } }));
  assert.equal(calls, 1);
  assert.equal((await status(o.orderId, o.accessToken)).body.state, 'READY');
});

test('report failure retries with backoff, then refunds automatically', async () => {
  setReportProvider(async () => { throw new Error('bureau down'); });
  const { body: o } = await createOrder();
  pay(o.orderId);
  let s = await status(o.orderId, o.accessToken);
  assert.equal(s.body.state, 'PROCESSING');
  const store = getStore();
  for (let i = 0; i < 2; i++) {
    const rec = await loadOrder(store, o.orderId);
    rec.nextFulfilAt = 0;
    await store.set(`cm:order:${o.orderId}`, JSON.stringify(rec), 60);
    s = await status(o.orderId, o.accessToken);
  }
  assert.equal(s.body.state, 'REFUND_PENDING');
  assert.equal(cf.refunds.size, 1);
  const refund = [...cf.refunds.values()][0];
  assert.equal(refund.refund_amount, 99);

  cf.refunds.get(refund.refund_id).refund_status = 'SUCCESS';
  await webhookPOST(signed({ type: 'REFUND_STATUS_WEBHOOK', data: { refund: { order_id: o.orderId, refund_status: 'SUCCESS' } } }));
  s = await status(o.orderId, o.accessToken);
  assert.equal(s.body.state, 'REFUNDED');
  assert.equal(cf.refunds.size, 1, 'never refunds twice');
});

test('permanent report errors (e.g. no credit record) refund immediately', async () => {
  setReportProvider(async () => { const e = new Error('no record'); e.permanent = true; throw e; });
  const { body: o } = await createOrder();
  pay(o.orderId);
  const s = await status(o.orderId, o.accessToken);
  assert.equal(s.body.state, 'REFUND_PENDING');
  assert.equal(s.body.report, null);
});

test('Turnstile is enforced when configured', async () => {
  process.env.TURNSTILE_SECRET_KEY = 'ts_secret';
  try {
    assert.equal((await createOrder()).res.status, 403);
    cf.turnstileOk = false;
    assert.equal((await createOrder({ turnstileToken: 'tok' })).res.status, 403);
    cf.turnstileOk = true;
    assert.equal((await createOrder({ turnstileToken: 'tok' })).res.status, 201);
  } finally {
    delete process.env.TURNSTILE_SECRET_KEY;
  }
});

test('reconcile job needs the cron secret and settles stuck orders', async () => {
  const { body: o } = await createOrder();
  pay(o.orderId);
  await getStore().zadd('cm:pending', Date.now() - 10 * 60e3, o.orderId);
  assert.equal((await cronGET(req('/api/cron/reconcile', null, { method: 'GET' }))).status, 401);
  assert.equal((await cronGET(req('/api/cron/reconcile', null, { method: 'GET', headers: { authorization: 'Bearer nope' } }))).status, 401);
  const res = await cronGET(req('/api/cron/reconcile', null, { method: 'GET', headers: { authorization: 'Bearer cron_test_secret' } }));
  const j = await res.json();
  assert.equal(j.settled, 1);
  assert.equal((await loadOrder(getStore(), o.orderId)).fulfil, 'DONE');
});

test('global order cap stops IP-rotating bots', async () => {
  process.env.ORDER_GLOBAL_LIMIT_PER_10MIN = '3';
  try {
    for (let i = 0; i < 3; i++) assert.equal((await createOrder()).res.status, 201);
    assert.equal((await createOrder()).res.status, 429);
  } finally {
    delete process.env.ORDER_GLOBAL_LIMIT_PER_10MIN;
  }
});

test('Cloudflare client IP is used only when explicitly trusted', async () => {
  const { clientIp } = await import('../api/_lib/http.mjs');
  const r = new Request('https://x.test', { headers: { 'cf-connecting-ip': '9.9.9.9', 'x-real-ip': '1.1.1.1' } });
  assert.equal(clientIp(r), '1.1.1.1');
  process.env.TRUST_CF_CONNECTING_IP = '1';
  try { assert.equal(clientIp(r), '9.9.9.9'); } finally { delete process.env.TRUST_CF_CONNECTING_IP; }
});

test('in production the in-memory store is refused and payments switch off', async () => {
  process.env.VERCEL_ENV = 'production';
  resetStoreForTests();
  try {
    const j = await (await configGET(new Request('https://credmates.test/api/cibil/config'))).json();
    assert.equal(j.enabled, false);
    assert.equal((await createOrder()).res.status, 503);
  } finally {
    delete process.env.VERCEL_ENV;
  }
});

test('missing keys switch payments off instead of faking success', async () => {
  const saved = process.env.CASHFREE_CLIENT_SECRET;
  delete process.env.CASHFREE_CLIENT_SECRET;
  try {
    const j = await (await configGET(new Request('https://credmates.test/api/cibil/config'))).json();
    assert.equal(j.enabled, false);
  } finally {
    process.env.CASHFREE_CLIENT_SECRET = saved;
  }
});
