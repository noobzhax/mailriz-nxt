import { Hono } from 'hono';
import { AppContext } from '../types';
import { MeResponse, AuthMode } from '@mailriz/shared';
import { requestHost } from '../lib/host';

export const meRoutes = new Hono<AppContext>();

meRoutes.get('/', async (c) => {
  const e = c.env;
  const user = c.get('user');
  // The domain the UI shows next to aliases is the mail domain, not the host
  // the dashboard happens to be served from.
  const domain = e.MAIL_DOMAIN || requestHost(c);
  // Language preference; absent DB (auth-only tests) means the en baseline.
  const row = e.DB
    ? await e.DB.prepare('SELECT language FROM settings WHERE user_id = ?1')
        .bind(user.email)
        .first<{ language: string | null }>()
    : null;
  const body: MeResponse = {
    email: user.email,
    mode: user.mode as AuthMode,
    domain,
    language: row?.language === 'id' ? 'id' : 'en',
  };
  return c.json(body);
});
