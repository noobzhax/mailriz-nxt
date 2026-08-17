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
  telegram_chat_id: string | null;
  telegram_full_body: number;
}

/** Telegram's hard cap on message length. */
export const TELEGRAM_MAX_LENGTH = 4096;

/**
 * Whether a new message should produce a Telegram notification.
 *
 * Global switch, chat id, and the per-alias mute all have to line up; a
 * missing token is handled later by sendTelegramMessage (the toggle may be
 * on before the deployer ever adds the secret).
 */
export function shouldNotify(
  settings: TelegramSettingsRow | null,
  alias: { telegram_muted?: number }
): boolean {
  if (!settings) return false;
  if (!settings.telegram_enabled) return false;
  if (!(settings.telegram_chat_id || '').trim()) return false;
  if (alias.telegram_muted) return false;
  return true;
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
}

/** Build the notification text; full body (if enabled) is capped at 4096. */
export function buildTelegramMessage(input: TelegramMessageInput): string {
  const lines = [
    `📬 ${input.fromName || input.fromAddress}${input.fromName ? ` <${input.fromAddress}>` : ''}`,
    `alias: ${input.localPart}@${input.domain}`,
    input.subject ? `Subject: ${input.subject}` : '',
    input.snippet,
    `🔗 https://${input.dashboardHostname}/inbox/${input.emailId}`,
  ];
  let msg = lines.filter((l) => l !== '').join('\n');

  if (input.fullBody && input.bodyText) {
    msg += `\n\n${input.bodyText}`;
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
 */
export async function sendTelegramMessage(
  env: Env,
  chatId: string,
  text: string
): Promise<TelegramSendResult> {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: 'No bot token deployed' };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    const body = (await res.json().catch(() => null)) as { ok?: boolean; description?: string } | null;
    if (!res.ok || !body?.ok) {
      const error = body?.description || `HTTP ${res.status}`;
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