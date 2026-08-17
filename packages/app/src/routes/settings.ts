import { Hono } from 'hono';
import { AppContext } from '../types';
import { TelegramSettings, UpdateTelegramSettingsInput } from '@mailriz/shared';
import { sendTelegramMessage, parseChatIds, telegramLabels, TelegramSettingsRow } from '../lib/telegram';

/**
 * Telegram notification settings. The bot token itself is a Worker secret
 * deployed by the CLI; this surface only ever reports whether it exists.
 * The webhook registration calls Telegram's API with that token so the bot
 * can receive /refresh commands.
 */

export const settingsRoutes = new Hono<AppContext>();

const SELECT_ROW =
  'SELECT telegram_enabled, telegram_chat_ids, telegram_full_body, telegram_webhook_secret, telegram_refresh_at, language FROM settings WHERE user_id = ?1';

async function getTelegramSettingsRow(c: any): Promise<TelegramSettingsRow | null> {
  const row = await c.env.DB.prepare(SELECT_ROW).bind(c.get('user').email).first();
  return row as TelegramSettingsRow | null;
}

const UPSERT_ROW = `INSERT INTO settings (user_id, telegram_enabled, telegram_chat_ids, telegram_full_body, language)
     VALUES (?1, ?2, ?3, ?4, ?5)
     ON CONFLICT (user_id) DO UPDATE SET
       telegram_enabled = excluded.telegram_enabled,
       telegram_chat_ids = excluded.telegram_chat_ids,
       telegram_full_body = excluded.telegram_full_body,
       language = excluded.language`;

async function telegramApi(env: any, method: string, params: Record<string, string>): Promise<any> {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: 'No bot token deployed' };
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}?${qs}`);
  return res.json().catch(() => ({ ok: false, description: `HTTP ${res.status}` }));
}

function randomHex(bytes: number): string {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return [...buf].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Register the bot webhook + the /refresh command menu, if a token exists. */
async function registerWebhook(env: any, secret: string, hostname: string): Promise<{ ok: boolean; error?: string }> {
  const url = `https://${hostname}/api/telegram/webhook`;
  const set = await telegramApi(env, 'setWebhook', { url, secret_token: secret });
  if (!set.ok) return { ok: false, error: set.description || 'setWebhook failed' };
  const menu = await telegramApi(env, 'setMyCommands', {
    commands: JSON.stringify([{ command: 'refresh', description: 'Refresh inbox' }]),
  });
  if (!menu.ok) return { ok: false, error: menu.description || 'setMyCommands failed' };
  return { ok: true };
}

async function webhookInfo(env: any): Promise<{ url: string | null }> {
  const info = await telegramApi(env, 'getWebhookInfo', {});
  if (!info.ok) return { url: null };
  return { url: info.result?.url || null };
}

function toTelegramSettings(c: any, row: TelegramSettingsRow | null): TelegramSettings {
  return {
    enabled: !!(row?.telegram_enabled),
    chatIds: parseChatIds(row?.telegram_chat_ids ?? null),
    fullBody: !!(row?.telegram_full_body),
    hasToken: !!c.env.TELEGRAM_BOT_TOKEN,
    webhookRegistered: !!row?.telegram_webhook_secret,
    language: row?.language === 'id' ? 'id' : 'en',
  };
}

settingsRoutes.get('/telegram', async (c) => {
  return c.json(toTelegramSettings(c, await getTelegramSettingsRow(c)));
});

settingsRoutes.patch('/telegram', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as UpdateTelegramSettingsInput;

  if (body.chatIds !== undefined) {
    for (const id of body.chatIds) {
      if (!/^-?\d+$/.test(id)) return c.json({ error: `chat id must be a number: ${id}` }, 400);
    }
  }

  if (body.language !== undefined && body.language !== 'en' && body.language !== 'id') {
    return c.json({ error: 'language must be en or id' }, 400);
  }

  const row = await getTelegramSettingsRow(c);
  const enabled = body.enabled !== undefined ? (body.enabled ? 1 : 0) : (row?.telegram_enabled ?? 0);
  const chatIds = body.chatIds !== undefined ? JSON.stringify(body.chatIds) : (row?.telegram_chat_ids ?? null);
  const fullBody = body.fullBody !== undefined ? (body.fullBody ? 1 : 0) : (row?.telegram_full_body ?? 0);
  const language = body.language !== undefined ? body.language : (row?.language ?? 'en');

  await c.env.DB.prepare(UPSERT_ROW)
    .bind(c.get('user').email, enabled, chatIds, fullBody, language)
    .run();

  return c.json({
    enabled: !!enabled,
    chatIds: parseChatIds(chatIds),
    fullBody: !!fullBody,
    hasToken: !!c.env.TELEGRAM_BOT_TOKEN,
    webhookRegistered: !!(row?.telegram_webhook_secret),
    language: language === 'id' ? 'id' : 'en',
  });
});

settingsRoutes.post('/telegram/test', async (c) => {
  const row = await getTelegramSettingsRow(c);
  const chatIds = parseChatIds(row?.telegram_chat_ids ?? null);
  if (chatIds.length === 0) {
    return c.json({ error: 'No chat ids configured' }, 400);
  }
  const message = telegramLabels(row?.language).testMessage;
  const results = [];
  for (const chatId of chatIds) {
    results.push(await sendTelegramMessage(c.env, chatId, message));
  }
  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    return c.json({ error: `Telegram rejected ${failed.length} chat(s): ${failed[0]!.error}` }, 502);
  }
  return c.json({ ok: true });
});

settingsRoutes.get('/telegram/webhook', async (c) => {
  const row = await getTelegramSettingsRow(c);
  const info = await webhookInfo(c.env);
  return c.json({
    registered: !!row?.telegram_webhook_secret && info.url?.endsWith('/api/telegram/webhook') === true,
    url: info.url,
  });
});

settingsRoutes.post('/telegram/webhook', async (c) => {
  const row = await getTelegramSettingsRow(c);
  let secret = row?.telegram_webhook_secret ?? null;
  if (!secret) {
    // First registration: mint the secret and keep it in the settings row.
    // The row may not exist yet (webhook before any chat config), so upsert.
    secret = randomHex(32);
    await c.env.DB.prepare(
      `INSERT INTO settings (user_id, telegram_webhook_secret) VALUES (?1, ?2)
       ON CONFLICT (user_id) DO UPDATE SET telegram_webhook_secret = excluded.telegram_webhook_secret`
    ).bind(c.get('user').email, secret).run();
  }
  const hostname = c.env.DASHBOARD_HOSTNAME;
  if (!hostname) return c.json({ error: 'DASHBOARD_HOSTNAME is not set' }, 500);
  const result = await registerWebhook(c.env, secret, hostname);
  if (!result.ok) return c.json({ error: result.error }, 502);
  return c.json({ ok: true });
});