import { Hono } from 'hono';
import { timingSafeEqualBytes } from '@mailriz/shared';
import { AppContext } from '../types';
import { parseChatIds } from '../lib/telegram';

/**
 * Telegram bot webhook — the public callback the bot's /refresh command
 * lands on. Mounted BEFORE jwtAuth on purpose: Telegram has no session, it
 * authenticates with the X-Telegram-Bot-Api-Secret-Token header we handed
 * to setWebhook.
 *
 * The single command is /refresh: it writes a marker the SSE stream watches
 * so an open dashboard tab refetches immediately.
 */

export const telegramWebhookRoutes = new Hono<AppContext>();

const REFRESH_RE = /^\/refresh(?:@[A-Za-z0-9_]+)?/;

const SETTINGS_SELECT =
  'SELECT telegram_webhook_secret, telegram_chat_ids FROM settings WHERE user_id = ?1';

telegramWebhookRoutes.post('/webhook', async (c) => {
  const env = c.env as any;
  const secret = c.req.header('X-Telegram-Bot-Api-Secret-Token') || '';
  const row = await env.DB.prepare(SETTINGS_SELECT)
    .bind(env.ADMIN_EMAIL || '')
    .first();
  const expected = (row?.telegram_webhook_secret as string | undefined) || '';
  const enc = new TextEncoder();
  // Constant-time compare; a wrong or missing secret is indistinguishable.
  if (!expected || !timingSafeEqualBytes(enc.encode(secret), enc.encode(expected))) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const update = (await c.req.json().catch(() => null)) as {
    message?: { text?: string; chat?: { id?: number } };
  } | null;
  const text = update?.message?.text || '';
  const chatId = String(update?.message?.chat?.id ?? '');
  const fromConfiguredChat = parseChatIds(row?.telegram_chat_ids ?? null).includes(chatId);

  if (fromConfiguredChat && REFRESH_RE.test(text)) {
    await env.DB.prepare('UPDATE settings SET telegram_refresh_at = ?1 WHERE user_id = ?2')
      .bind(Math.floor(Date.now() / 1000), env.ADMIN_EMAIL || '')
      .run();
    // Acknowledge. This must be awaited: an unawaited fetch dies with the
    // request, and the user would see no reply at all. A failed reply still
    // must not matter to the refresh itself.
    const token = env.TELEGRAM_BOT_TOKEN as string | undefined;
    if (token) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: '🔄 Memeriksa inbox…' }),
      }).catch(() => {});
    }
  }

  return c.json({ ok: true });
});