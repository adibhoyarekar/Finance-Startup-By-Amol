import { cashfreeConfig } from '../_lib/config.mjs';
import { cashfreeConfigured } from '../_lib/cashfree.mjs';
import { hasDataKey } from '../_lib/crypto.mjs';
import { storeConfigured } from '../_lib/store.mjs';
import { handle, json } from '../_lib/http.mjs';

export const GET = handle(async () => {
  const enabled = cashfreeConfigured() && storeConfigured() && hasDataKey();
  return json(200, {
    enabled,
    mode: cashfreeConfig().mode,
    turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || null
  });
});
