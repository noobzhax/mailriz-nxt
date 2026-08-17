import { Env } from '../types';

/**
 * Telegram email notifications.
 *
 * Pure, side-effect-free helpers live here so the notify decision and the
 * message text are unit-testable; sendTelegramMessage is the only place that
 * touches the Telegram Bot API.
 */

/** Settings row shape as stored in the D1 `settings` table. */
export interface TelegramSettingsRow {
  telegram_enabled: number;
  /** JSON array of chat ids, e.g. `["123456","-100789"]`. */
  telegram_chat_ids: string | null;
  telegram_full_body: number;
  telegram_webhook_secret?: string | null;
  telegram_refresh_at?: number | null;
}

/** Telegram's hard cap on message length. */
export const TELEGRAM_MAX_LENGTH = 4096;

/** Read the chat id list out of the stored JSON array, dropping junk. */
export function parseChatIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string' && /^-?\d+$/.test(v));
  } catch {
    return [];
  }
}

/**
 * Whether a new message should produce a Telegram notification.
 *
 * Global switch, at least one chat id, and the per-alias mute all have to
 * line up; a missing token is handled later by sendTelegramMessage (the
 * toggle may be on before the deployer ever adds the secret).
 */
export function shouldNotify(
  settings: TelegramSettingsRow | null,
  alias: { telegram_muted?: number }
): boolean {
  if (!settings) return false;
  if (!settings.telegram_enabled) return false;
  if (parseChatIds(settings.telegram_chat_ids).length === 0) return false;
  if (alias.telegram_muted) return false;
  return true;
}

/** Escape text for Telegram's HTML parse mode — it is strict about < and &. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export interface TelegramMessageInput {
  fromName: string;
  fromAddress: string;
  localPart: string;
  domain: string;
  subject: string;
  snippet: string;
  bodyText: string;
  fullBody: boolean;
  dashboardHostname: string;
  emailId: string;
  /** Unix seconds the mail arrived; rendered as a UTC timestamp line. */
  receivedAt?: number;
}

/** `2026-08-17 10:20 UTC` from unix seconds. */
function formatReceivedAt(seconds: number): string {
  return new Date(seconds * 1000).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

/** Rule separating the header block from the snippet/body. */
const SEPARATOR = '──────────────────';

/** Build the notification text (HTML parse mode); full body capped at 4096. */
export function buildTelegramMessage(input: TelegramMessageInput): string {
  const sender = input.fromName
    ? `<b>${escapeHtml(input.fromName)}</b> &lt;${escapeHtml(input.fromAddress)}&gt;`
    : `<b>${escapeHtml(input.fromAddress)}</b>`;
  const header = [
    `📬 ${sender}`,
    `alias: <code>${escapeHtml(input.localPart)}@${escapeHtml(input.domain)}</code>`,
    input.subject ? `Subject: <b>${escapeHtml(input.subject)}</b>` : '',
    input.receivedAt ? `🕐 ${formatReceivedAt(input.receivedAt)}` : '',
  ].filter((l) => l !== '').join('\n');

  // Header first, then a rule, then the content — the scan line separates
  // who/what from the actual message text.
  let msg = `${header}\n${SEPARATOR}\n${escapeHtml(input.snippet)}`;

  if (input.fullBody && input.bodyText) {
    msg += `\n\n${escapeHtml(input.bodyText)}`;
  }
  if (msg.length > TELEGRAM_MAX_LENGTH) {
    msg = msg.slice(0, TELEGRAM_MAX_LENGTH);
  }
  return msg;
}

/** Outcome of a send attempt; `error` is Telegram's own message when set. */
export interface TelegramSendResult {
  ok: boolean;
  error?: string;
}

/**
 * POST a message to the bot API. Best-effort: never throws, and on failure
 * carries Telegram's error text so a caller can surface the real reason
 * (wrong chat id, bot blocked, …).
 *
 * When `buttonUrl` is given the message is sent with HTML parse mode and an
 * inline keyboard button; otherwise it goes out as plain text.
 */
export async function sendTelegramMessage(
  env: Env,
  chatId: string,
  text: string,
  opts: { buttonUrl?: string } = {}
): Promise<TelegramSendResult> {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: 'No bot token deployed' };
  try {
    const body: Record<string, unknown> = { chat_id: chatId, text };
    if (opts.buttonUrl) {
      body.parse_mode = 'HTML';
      body.reply_markup = {
        inline_keyboard: [[{ text: 'Buka di Dashboard', url: opts.buttonUrl }]],
      };
    }
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const parsed = (await res.json().catch(() => null)) as { ok?: boolean; description?: string } | null;
    if (!res.ok || !parsed?.ok) {
      const error = parsed?.description || `HTTP ${res.status}`;
      console.error(`[telegram] sendMessage failed: ${error}`);
      return { ok: false, error };
    }
    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[telegram] sendMessage threw: ${error}`);
    return { ok: false, error };
  }
}