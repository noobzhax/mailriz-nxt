# Telegram Email Notifications — Design

**Date:** 2026-08-17
**Status:** Approved (user), pending implementation

## Goal

When a new email arrives, send a real-time notification to a Telegram private chat via a bot. Default is a short notification (sender, subject, snippet, deep link); optionally include the full body text. Configurable globally (enable/disable, full body) and per-alias (mute).

## Constraints

- MailRiz is a single-user service: everything belongs to `ADMIN_EMAIL`.
- Worker secrets and vars share one namespace — the bot token must be a secret via `wrangler secret bulk`, never a var.
- Telegram delivery must never block or fail email delivery: fire-and-forget via `ctx.waitUntil`.
- No third-party integrations exist today; this is the first outbound call from the Worker.

## Architecture

```
CLI wizard (setup/reconfigure)
  └─ optional prompt: Telegram bot token → ~/.mailriz/config.json → secret via wrangler secret bulk

D1 migration 0004_telegram.sql:
  settings (singleton, keyed by user_id = admin email)
    telegram_enabled   INTEGER NOT NULL DEFAULT 0
    telegram_chat_id   TEXT     (nullable; null = not configured)
    telegram_full_body INTEGER NOT NULL DEFAULT 0
  aliases: + telegram_muted INTEGER NOT NULL DEFAULT 0

Worker:
  lib/telegram.ts       sendTelegramMessage(env, chatId, text)
  email.ts              ctx.waitUntil(notifyTelegram(...)) after D1 insert
  routes/settings.ts    GET/PATCH /api/settings/telegram, POST /api/settings/telegram/test
  routes/aliases.ts     PATCH gains telegram_muted

CLI:
  cli.ts                new prompt in setup + reconfigure, bulk secret deploy, status check

Shared:
  TelegramSettings type + API contract types
```

## Data flow

1. Email lands → `emailHandler` parses, stores raw/HTML/attachments, inserts D1 rows (unchanged).
2. After insert, `ctx.waitUntil(notifyTelegram(...))`:
   - Read settings row. Return silently if disabled, no chat id, or alias `telegram_muted`.
   - Build message:
     ```
     📬 From Name <from@address>
     alias: local@domain
     Subject: {subject}
     {snippet}
     🔗 https://{DASHBOARD_HOSTNAME}/inbox/{emailId}
     ```
   - If `telegram_full_body`, append `body_text` truncated to 4096 chars (Telegram message limit).
   - `sendMessage` via `https://api.telegram.org/bot{TOKEN}/sendMessage` with `chat_id` and `text`. On failure: `console.error` and drop (no retry queue).
3. Dashboard `/settings` page: enabled toggle, chat id input (hint: discover via @userinfobot after messaging the bot), full-body toggle, "Send test message" button. Per-alias mute toggle on the existing alias list.

## API surface

- `GET /api/settings/telegram` → `{ enabled, chatId, fullBody, hasToken }` (hasToken = whether the secret is present, never the token itself)
- `PATCH /api/settings/telegram` → body `{ enabled?, chatId?, fullBody? }`; chat id may be set to null/"" to clear
- `POST /api/settings/telegram/test` → sends a real test message; returns Telegram's error verbatim on failure (surfaces wrong chat id / bot blocked)
- `PATCH /api/aliases/:id` → gains `telegram_muted` field
- All routes behind the existing `jwtAuth` middleware.

## CLI changes

- `setup` / `reconfigure`: optional prompt "Telegram bot token? (empty to skip)". Empty string removes the secret. Persisted in `~/.mailriz/config.json`.
- Token deployed via `wrangler secret bulk` alongside `SESSION_*` (after deploy; Worker must exist).
- `status`: report whether `TELEGRAM_BOT_TOKEN` is set.

## Message format details

- Deep link `https://{DASHBOARD_HOSTNAME}/inbox/{emailId}` — the SPA already parses this route shape (`/:emailId` under a folder).
- Snippet reuses the existing `makeSnippet` helper.
- Full body text comes from the already-stored `emails.body_text` column.

## Error handling

- Telegram failures never affect mail storage: `waitUntil` makes delivery best-effort, and the D1 insert happens before the notification fires.
- No token secret → notifications disabled regardless of toggle (prevents silent failure when the CLI was set up without Telegram).
- Test button returns Telegram's JSON error so the user sees the real reason (e.g., "chat not found").

## Testing

- `telegram.test.ts`: message building (with/without full body, truncation at 4096), mute/enabled/chat-id-missing short-circuits, sendMessage against a mocked fetch (success + failure).
- `settings-route.test.ts`: GET/PATCH/test endpoints, auth guard.
- CLI tests: new prompt flow, secret bulk payload, empty-token removal.

## Out of scope

- Reply-from-Telegram.
- Forwarding attachments into Telegram.
- Multiple chat ids / per-user routing (single-user service).
- Retry queue or delivery guarantees.