# Changelog

All notable changes to MailRiz NXT — the fork of
[MailRiz](https://github.com/rizkirmdhnnn/mailriz) with Telegram
notifications. Releases follow [Conventional Commits](https://www.conventionalcommits.org/).

## [v1.5.0] — 2026-08-17

### Added
- **Language setting** (Settings → Language, `en`/`id`), stored in D1
  (migration `0006`) and exposed through `/api/me` and the settings API.
  It drives the dashboard UI *and* the Telegram messages (labels, the open
  button, the `/refresh` reply).
- **i18n foundation**: every user-visible dashboard string now lives in a
  typed dictionary (`lib/i18n.ts`). English is the complete baseline;
  Bahasa Indonesia entries fall back to English until the translation lands
  (the selector shows a "soon" note when `id` is picked).
- Web tests for the dictionary.

### Changed
- Telegram message labels (`alias`, `Subject`, button text, `/refresh` reply,
  test message) come from the language setting instead of being hardcoded.

[v1.5.0]: https://github.com/noobzhax/mailriz-nxt/releases/tag/v1.5.0

## [v1.4.2] — 2026-08-17

### Changed
- Notification layout: the header block (sender, alias, subject, arrival
  time) is separated from the message content with a rule line, so the
  body never glues to the metadata.

## [v1.4.1] — 2026-08-17

### Added
- Notifications carry the arrival time: `🕐 2026-08-17 10:20 UTC` (UTC so
  every chat renders the same moment).
- Dashboard: pressing **`R`** refreshes the inbox (skipped while typing in
  a field); the toolbar tooltip says so.

### Fixed
- `/refresh` now actually answers in Telegram: the acknowledgement was
  fire-and-forget and died with the webhook request — it is awaited, so
  the bot replies "🔄 Memeriksa inbox…".

## [v1.4.0] — 2026-08-17

### Added
- **Multiple chat ids**: notifications go to every configured chat. The
  dashboard input is comma-separated (`123456789, -1001234567890`);
  stored as a JSON list (migration `0005`, old single id migrated).
  One failing chat never blocks the others.
- **HTML message design**: notifications render with Telegram's HTML
  formatting — bold sender and subject, `code` alias, escaped user
  content — plus an inline **"Buka di Dashboard"** button instead of a
  raw link.
- **`/refresh` bot command**: send it from any configured chat and an
  open dashboard tab refetches immediately. The bot answers
  "🔄 Memeriksa inbox…". Backed by a public webhook
  (`POST /api/telegram/webhook`) verified with a per-install secret
  token, registered from the dashboard Settings page (`setWebhook` +
  `setMyCommands`).
- Cloudflare Access installs: the CLI creates a path-scoped Access
  application (Bypass policy) so Telegram's servers can reach the
  webhook without a session.

### Changed
- `settings.telegram_chat_id` (single) → `telegram_chat_ids` (JSON list).

## [v1.3.0] — 2026-08-17

First release published from this fork.

### Changed
- CLI published as **`mailriz-cli-nxt`** on npm (the upstream name is
  owned by the original publisher).
- The CLI downloads the Worker bundle from **this fork's** GitHub
  Releases (`noobzhax/mailriz-nxt`) instead of upstream — a `setup` or
  `reconfigure` here deploys the fork's Worker, including the Telegram
  feature and its migrations.
- `bin` path fixed (`dist/cli.js`) so the published package ships a
  working `mailriz-cli` executable.
- Repository URL + provenance point at the fork.

## [v1.2.0] — 2026-08-17

Worker release only (npm name collision blocked publishing; fixed in
v1.3.0).

### Added
- **Telegram email notifications** — the fork's headline feature:
  every incoming email pushes a notification (sender, subject, snippet,
  deep link) to a Telegram chat.
  - Bot token deployed as a Worker **secret** by the CLI
    (`setup` / `update` / `reconfigure`); skipped prompt clears it.
  - Global toggle, chat id, and full-body option in the dashboard
    **Settings** page; **Send test message** button surfaces Telegram's
    own error text.
  - Per-alias **mute** (bell in the sidebar).
  - Notifications fire via `ctx.waitUntil` — Telegram failures never
    delay mail delivery.
  - Migration `0004` (`settings` table + `aliases.telegram_muted`).

[v1.2.0]: https://github.com/noobzhax/mailriz-nxt/releases/tag/v1.2.0
[v1.3.0]: https://github.com/noobzhax/mailriz-nxt/releases/tag/v1.3.0
[v1.4.0]: https://github.com/noobzhax/mailriz-nxt/releases/tag/v1.4.0
[v1.4.1]: https://github.com/noobzhax/mailriz-nxt/releases/tag/v1.4.1
[v1.4.2]: https://github.com/noobzhax/mailriz-nxt/releases/tag/v1.4.2