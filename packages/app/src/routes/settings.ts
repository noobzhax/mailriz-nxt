import { Hono } from 'hono';
import { AppContext } from '../types';
import { TelegramSettings, UpdateTelegramSettingsInput } from '@mailriz/shared';
import { sendTelegramMessage, TelegramSettingsRow } from '../lib/telegram';

/**
 * Telegram notification settings. The bot token itself is a Worker secret
 * deployed by the CLI; this surface only ever reports whether it exists.
 */

export const settingsRoutes = new Hono<AppContext>();

const SELECT_ROW = 'SELECT telegram_enabled, telegram_chat_id, telegram_full_body FROM settings WHERE user_id = ?1';

async function getTelegramSettingsRow(c: any): Promise<TelegramSettingsRow | null> {
  const row = await c.env.DB.prepare(SELECT_ROW).bind(c.get('user').email).first();
  return row as TelegramSettingsRow | null;
}

function toTelegramSettings(c: any, row: TelegramSettingsRow | null): TelegramSettings {
  return {
    enabled: !!(row?.telegram_enabled),
    chatId: row?.telegram_chat_id || null,
    fullBody: !!(row?.telegram_full_body),
    hasToken: !!c.env.TELEGRAM_BOT_TOKEN,
  };
}

settingsRoutes.get('/telegram', async (c) => {
  return c.json(toTelegramSettings(c, await getTelegramSettingsRow(c)));
});

settingsRoutes.patch('/telegram', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as UpdateTelegramSettingsInput;

  const chatIdRaw = body.chatId;
  if (chatIdRaw !== undefined && chatIdRaw !== null && String(chatIdRaw).length > 0 && !/^-?\d+$/.test(String(chatIdRaw))) {
    return c.json({ error: 'chat_id must be a number' }, 400);
  }

  const row = await getTelegramSettingsRow(c);
  const enabled = body.enabled !== undefined ? (body.enabled ? 1 : 0) : (row?.telegram_enabled ?? 0);
  const chatId = body.chatId !== undefined ? (body.chatId || null) : (row?.telegram_chat_id ?? null);
  const fullBody = body.fullBody !== undefined ? (body.fullBody ? 1 : 0) : (row?.telegram_full_body ?? 0);

  await c.env.DB.prepare(
    `INSERT INTO settings (user_id, telegram_enabled, telegram_chat_id, telegram_full_body)
     VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT (user_id) DO UPDATE SET
       telegram_enabled = excluded.telegram_enabled,
       telegram_chat_id = excluded.telegram_chat_id,
       telegram_full_body = excluded.telegram_full_body`
  )
    .bind(c.get('user').email, enabled, chatId, fullBody)
    .run();

  return c.json({ enabled: !!enabled, chatId, fullBody: !!fullBody, hasToken: !!c.env.TELEGRAM_BOT_TOKEN });
});

settingsRoutes.post('/telegram/test', async (c) => {
  const row = await getTelegramSettingsRow(c);
  if (!row?.telegram_chat_id) {
    return c.json({ error: 'No chat id configured' }, 400);
  }
  const result = await sendTelegramMessage(
    c.env,
    row.telegram_chat_id,
    '🔔 MailRiz test message — Telegram notifications are working.'
  );
  if (!result.ok) {
    return c.json({ error: result.error || 'Telegram rejected the message' }, 502);
  }
  return c.json({ ok: true });
});