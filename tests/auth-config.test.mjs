import { test } from 'node:test';
import assert from 'node:assert/strict';

const { publicAuthConfig, GET } = await import('../api/auth/config.mjs');

const URL_OK = 'https://hypubmfntdcxijwqcgxr.supabase.co';
const jwt = (payload) => ['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', Buffer.from(JSON.stringify(payload)).toString('base64url'), 'sig'].join('.');

test('returns the URL and public anon key', () => {
  const key = jwt({ role: 'anon', ref: 'hypubmfntdcxijwqcgxr' });
  assert.deepEqual(publicAuthConfig({ SUPABASE_URL: URL_OK + '/', SUPABASE_ANON_KEY: key }), { configured: true, url: URL_OK, key });
});

test('accepts a new-style publishable key', () => {
  const r = publicAuthConfig({ SUPABASE_URL: URL_OK, SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc123' });
  assert.equal(r.configured, true);
  assert.equal(r.key, 'sb_publishable_abc123');
});

test('never serves a service_role or secret key, even if put in the wrong variable', () => {
  assert.deepEqual(publicAuthConfig({ SUPABASE_URL: URL_OK, SUPABASE_ANON_KEY: jwt({ role: 'service_role' }) }), { configured: false });
  assert.deepEqual(publicAuthConfig({ SUPABASE_URL: URL_OK, SUPABASE_ANON_KEY: 'sb_secret_abc123' }), { configured: false });
  assert.deepEqual(publicAuthConfig({ SUPABASE_URL: URL_OK, SUPABASE_ANON_KEY: 'not-a-key' }), { configured: false });
});

test('rejects a URL that is not a Supabase project URL', () => {
  const key = jwt({ role: 'anon' });
  for (const u of ['http://hypubmfntdcxijwqcgxr.supabase.co', 'https://evil.example.com', 'https://hypubmfntdcxijwqcgxr.supabase.co.evil.com']) {
    assert.deepEqual(publicAuthConfig({ SUPABASE_URL: u, SUPABASE_ANON_KEY: key }), { configured: false }, u);
  }
});

test('not configured when variables are missing', () => {
  assert.deepEqual(publicAuthConfig({}), { configured: false });
});

test('GET responds with JSON and no-store', async () => {
  delete process.env.SUPABASE_URL; delete process.env.SUPABASE_ANON_KEY; delete process.env.SUPABASE_PUBLISHABLE_KEY;
  const res = await GET(new Request('https://x.test/api/auth/config'));
  assert.equal(res.status, 200);
  assert.match(res.headers.get('cache-control'), /no-store/);
  assert.deepEqual(await res.json(), { configured: false });
});
