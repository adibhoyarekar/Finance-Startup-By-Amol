import { isProd } from './config.mjs';
import { HttpError } from './http.mjs';

function upstash(url, token) {
  async function cmd(...args) {
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify(args.map(String)),
        signal: AbortSignal.timeout(5000)
      });
    } catch {
      throw new HttpError(503, 'store_unavailable', 'Service is busy. Please try again in a moment.');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) throw new HttpError(503, 'store_unavailable', 'Service is busy. Please try again in a moment.');
    return data.result;
  }
  return {
    get: (k) => cmd('GET', k),
    set: (k, v, ttl) => cmd('SET', k, v, 'EX', ttl),
    setNX: async (k, v, ttl) => (await cmd('SET', k, v, 'NX', 'EX', ttl)) === 'OK',
    del: (k) => cmd('DEL', k),
    // SET NX first so INCR keeps the TTL even if this call is interrupted between commands.
    incrWindow: async (k, ttl) => { await cmd('SET', k, '0', 'NX', 'EX', ttl); return Number(await cmd('INCR', k)); },
    zadd: (k, score, m) => cmd('ZADD', k, score, m),
    zrem: (k, m) => cmd('ZREM', k, m),
    zrangeByScore: async (k, max, limit) => (await cmd('ZRANGEBYSCORE', k, '-inf', max, 'LIMIT', 0, limit)) || []
  };
}

function memory() {
  const kv = new Map();
  const zs = new Map();
  const live = (k) => {
    const e = kv.get(k);
    if (e && e.exp < Date.now()) { kv.delete(k); return undefined; }
    return e;
  };
  return {
    get: async (k) => (live(k) ? live(k).v : null),
    set: async (k, v, ttl) => { kv.set(k, { v: String(v), exp: Date.now() + ttl * 1000 }); return 'OK'; },
    setNX: async (k, v, ttl) => { if (live(k)) return false; kv.set(k, { v: String(v), exp: Date.now() + ttl * 1000 }); return true; },
    del: async (k) => { kv.delete(k); return 1; },
    incrWindow: async (k, ttl) => {
      const e = live(k) || { v: '0', exp: Date.now() + ttl * 1000 };
      e.v = String(Number(e.v) + 1); kv.set(k, e); return Number(e.v);
    },
    zadd: async (k, score, m) => { if (!zs.has(k)) zs.set(k, new Map()); zs.get(k).set(m, Number(score)); return 1; },
    zrem: async (k, m) => { if (zs.has(k)) zs.get(k).delete(m); return 1; },
    zrangeByScore: async (k, max, limit) => [...(zs.get(k) || new Map())].filter(([, s]) => s <= Number(max)).sort((a, b) => a[1] - b[1]).slice(0, limit).map(([m]) => m)
  };
}

let instance = null;
let instanceKey = '';

function resolve() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '';
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';
  if (url && token) return { key: `u:${url}`, make: () => upstash(url, token) };
  if (process.env.CM_STORE === 'memory' && !isProd()) return { key: 'memory', make: memory };
  return null;
}

export function storeConfigured() {
  return resolve() !== null;
}

export function getStore() {
  const r = resolve();
  if (!r) throw new HttpError(503, 'payments_unavailable', 'Payments are not available right now.');
  if (!instance || instanceKey !== r.key) { instance = r.make(); instanceKey = r.key; }
  return instance;
}

export function resetStoreForTests() {
  instance = null;
  instanceKey = '';
}
