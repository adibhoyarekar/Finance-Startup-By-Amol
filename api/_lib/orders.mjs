import { PRODUCTS, ORDER_TTL_S, CHECKOUT_WINDOW_MS } from './config.mjs';
import { encrypt, decrypt, randomHex, randomToken, sha256 } from './crypto.mjs';
import { getOrder, getPayments, createRefund, getRefund, GatewayError } from './cashfree.mjs';
import { fetchReport } from './bureau.mjs';
import { log } from './http.mjs';

export const K = {
  order: (id) => `cm:order:${id}`,
  lock: (id) => `cm:lock:${id}`,
  fulfil: (id) => `cm:fulfil:${id}`,
  sync: (id) => `cm:sync:${id}`,
  evt: (h) => `cm:evt:${h}`,
  pending: 'cm:pending'
};

const MAX_FULFIL_ATTEMPTS = 3;
const MAX_REFUND_ATTEMPTS = 5;
const FULFIL_BACKOFF_MS = [0, 30e3, 120e3];

export function newOrder(input) {
  const product = PRODUCTS[input.bureau];
  const token = randomToken();
  const now = Date.now();
  const order = {
    id: 'cm_' + randomHex(12),
    v: 1,
    bureau: input.bureau,
    amount: product.amount,
    gender: input.gender || null,
    currency: 'INR',
    status: 'CREATED',
    fulfil: 'NONE',
    attempt: null,
    tokenHash: sha256(token),
    nameEnc: encrypt(input.name),
    panEnc: encrypt(input.pan),
    phoneEnc: encrypt(input.phone),
    panMasked: input.pan.slice(0, 5) + '****' + input.pan.slice(9),
    phoneMasked: input.phone.slice(0, 2) + '******' + input.phone.slice(8),
    consentAt: now,
    createdAt: now,
    expiresAt: now + CHECKOUT_WINDOW_MS
  };
  return { order, token };
}

export async function loadOrder(store, id) {
  const raw = await store.get(K.order(id));
  return raw ? JSON.parse(raw) : null;
}

export async function saveOrder(store, o) {
  o.updatedAt = Date.now();
  await store.set(K.order(o.id), JSON.stringify(o), ORDER_TTL_S);
}

export function isSettled(o) {
  return ['CREATE_FAILED', 'EXPIRED', 'REFUNDED', 'REVIEW'].includes(o.status) || (o.status === 'PAID' && o.fulfil === 'DONE');
}

function paise(n) {
  return Math.round(Number(n) * 100);
}

function flag(o, reason) {
  o.status = 'REVIEW';
  o.reviewReason = reason;
  log('error', 'payment_needs_review', { orderId: o.id, reason });
}

const METHOD = { upi: 'UPI', credit_card: 'Credit card', debit_card: 'Debit card', net_banking: 'Net banking', wallet: 'Wallet', pay_later: 'Pay later', cardless_emi: 'EMI', credit_card_emi: 'Card EMI', debit_card_emi: 'Card EMI' };

function latest(payments) {
  return (Array.isArray(payments) ? payments : []).slice().sort((a, b) => Date.parse(b.payment_time || 0) - Date.parse(a.payment_time || 0));
}

async function markPaid(o) {
  const list = latest(await getPayments(o.id));
  const ok = list.find((p) => p.payment_status === 'SUCCESS');
  if (!ok) {
    log('warn', 'paid_without_success_payment', { orderId: o.id });
    return;
  }
  if (paise(ok.payment_amount) !== paise(o.amount) || (ok.payment_currency && ok.payment_currency !== 'INR')) {
    flag(o, 'payment_amount_mismatch');
    return;
  }
  o.status = 'PAID';
  o.attempt = 'SUCCESS';
  o.payment = {
    id: String(ok.cf_payment_id),
    method: METHOD[ok.payment_group] || 'Online',
    paidAt: ok.payment_completion_time || ok.payment_time || new Date().toISOString()
  };
  log('info', 'payment_confirmed', { orderId: o.id, paymentId: o.payment.id, amount: o.amount });
}

async function fulfil(store, o) {
  if (o.fulfil === 'DONE' || o.fulfil === 'FAILED') return;
  if (o.nextFulfilAt && Date.now() < o.nextFulfilAt) return;
  if (!(await store.setNX(K.fulfil(o.id), '1', 120))) return;
  o.fulfil = 'IN_PROGRESS';
  o.fulfilAttempts = (o.fulfilAttempts || 0) + 1;
  await saveOrder(store, o);
  try {
    const report = await fetchReport({ bureau: o.bureau, name: decrypt(o.nameEnc), pan: decrypt(o.panEnc), phone: decrypt(o.phoneEnc), gender: o.gender || null });
    o.report = report;
    o.fulfil = 'DONE';
    o.deliveredAt = Date.now();
    delete o.nextFulfilAt;
  } catch (e) {
    log('error', 'fulfil_failed', { orderId: o.id, attempt: o.fulfilAttempts, permanent: Boolean(e && e.permanent), err: e && e.message });
    if ((e && e.permanent) || o.fulfilAttempts >= MAX_FULFIL_ATTEMPTS) {
      o.fulfil = 'FAILED';
      await startRefund(o, 'Credit report could not be generated');
    } else {
      o.fulfil = 'RETRY';
      o.nextFulfilAt = Date.now() + FULFIL_BACKOFF_MS[o.fulfilAttempts];
    }
  } finally {
    await store.del(K.fulfil(o.id));
  }
}

function normRefund(s) {
  if (s === 'SUCCESS') return 'SUCCESS';
  if (s === 'CANCELLED' || s === 'FAILED') return 'FAILED';
  return 'PENDING';
}

async function startRefund(o, note) {
  if (o.refund) return;
  o.refund = { id: 'rf_' + o.id.slice(3), amount: o.amount, status: 'RETRY', note, attempts: 0 };
  o.status = 'REFUND_PENDING';
  await progressRefund(o);
}

async function progressRefund(o) {
  const r = o.refund;
  if (!r) return;
  try {
    if (r.status === 'RETRY') {
      r.attempts += 1;
      const res = await createRefund(o.id, { refund_amount: o.amount, refund_id: r.id, refund_note: r.note });
      r.status = normRefund(res && res.refund_status);
    } else if (r.status === 'PENDING') {
      const res = await getRefund(o.id, r.id);
      r.status = normRefund(res && res.refund_status);
    }
  } catch (e) {
    if (e instanceof GatewayError && e.status === 409) {
      r.status = 'PENDING';
    } else {
      log('error', 'refund_call_failed', { orderId: o.id, attempt: r.attempts, err: e && e.message });
      if (r.status === 'RETRY' && r.attempts >= MAX_REFUND_ATTEMPTS) flag(o, 'refund_not_created');
    }
  }
  if (r.status === 'SUCCESS') {
    o.status = 'REFUNDED';
    r.doneAt = Date.now();
    log('info', 'refund_completed', { orderId: o.id, amount: r.amount });
  } else if (r.status === 'FAILED') {
    flag(o, 'refund_failed');
  }
}

async function reconcile(store, o) {
  if (o.status === 'CREATED') {
    const cf = await getOrder(o.id);
    if (!cf || cf.order_id !== o.id || paise(cf.order_amount) !== paise(o.amount) || cf.order_currency !== 'INR') {
      flag(o, 'order_mismatch');
      return;
    }
    if (cf.order_status === 'PAID') {
      await markPaid(o);
    } else if (cf.order_status === 'EXPIRED' || cf.order_status === 'TERMINATED') {
      o.status = 'EXPIRED';
    } else {
      const last = latest(await getPayments(o.id))[0];
      o.attempt = last ? last.payment_status : null;
    }
  }
  if (o.status === 'PAID') await fulfil(store, o);
  if (o.status === 'REFUND_PENDING') await progressRefund(o);
}

export async function syncOrder(store, id) {
  const lockVal = randomHex(8);
  if (!(await store.setNX(K.lock(id), lockVal, 30))) return { order: await loadOrder(store, id), busy: true };
  try {
    const o = await loadOrder(store, id);
    if (!o) return { order: null };
    if (isSettled(o)) return { order: o };
    await reconcile(store, o);
    await saveOrder(store, o);
    if (isSettled(o)) await store.zrem(K.pending, o.id);
    return { order: o };
  } finally {
    if ((await store.get(K.lock(id))) === lockVal) await store.del(K.lock(id));
  }
}

function safeName(o) {
  try { return decrypt(o.nameEnc); } catch { return ''; }
}

export function publicView(o) {
  let state;
  if (o.status === 'PAID') state = o.fulfil === 'DONE' ? 'READY' : 'PROCESSING';
  else if (o.status === 'CREATED') state = o.attempt === 'PENDING' ? 'PENDING' : 'AWAITING_PAYMENT';
  else if (o.status === 'EXPIRED' || o.status === 'CREATE_FAILED') state = 'EXPIRED';
  else if (o.status === 'REFUND_PENDING' || o.status === 'REFUNDED') state = o.status;
  else state = 'REVIEW';
  return {
    state,
    orderId: o.id,
    bureau: o.bureau,
    bureauLabel: PRODUCTS[o.bureau].label,
    amount: o.amount,
    attempt: o.attempt || null,
    customer: { name: safeName(o), phone: o.phoneMasked, pan: o.panMasked },
    payment: o.payment || null,
    report: state === 'READY' ? o.report : null,
    refund: o.refund ? { status: o.refund.status, amount: o.refund.amount } : null
  };
}
