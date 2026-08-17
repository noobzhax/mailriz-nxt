---
title: Telegram notifications
description: Get a Telegram message the moment mail arrives — with a button straight to the message, and /refresh to force the dashboard to reload.
---

When a new email lands, MailRiz sends a notification to **every configured
Telegram chat**: the sender, the subject, a short snippet, and a button that
opens the message in the dashboard. Optionally, the full plain-text body
rides along (capped at 4096 characters, Telegram's message limit).

## What you need

- A Telegram bot — create one with **@BotFather** and keep the token it gives you
- The chat ids of the chats the bot should write into (see below)
- Telegram notifications deployed on your install (one command, below)

## Deploy the bot token

The bot token is a Worker secret, so it goes in through the CLI:

```bash
bunx mailriz-cli-nxt@latest reconfigure
```

When the wizard asks for the **Telegram bot token**, paste it (or leave it
empty to skip). The token can also be added or replaced later with the same
command — a skipped prompt clears a previously deployed token.

## Find your chat ids

A chat id only exists once you have messaged the bot: open the chat with your
bot in Telegram and send it anything (a `/start` works). Then ask
**@userinfobot** to tell you the id of that chat — it replies with a number,
positive for a private chat, negative for a group. Repeat for every chat
(own private chat, a family group, an office channel…) and collect the ids.

## Switch it on

Open **Settings → Telegram** in the dashboard:

1. Paste the chat ids, **comma-separated** (e.g. `123456789, -1001234567890`),
   and press **Save**
2. Turn on **Receive new-mail notifications**
3. Press **Send test message** — a test message should appear in every
   configured chat immediately

If the test fails, the settings page shows Telegram's own error text — the
usual causes are a chat id typo, or the bot not being able to message that
chat (a group needs the bot added as a member first).

## Refresh the inbox from Telegram

The bot understands one command: **`/refresh`**. Send it from any configured
chat and an open dashboard tab refetches its inbox immediately — handy when
you are on the phone and the desktop is sitting on a stale view.

To enable it:

1. In **Settings → Telegram**, press **Register webhook** (the bot's "/"
   menu then lists the command)
2. Send **`/refresh`** to the bot — it replies "🔄 Memeriksa inbox…" and the
   dashboard reloads

The webhook lives at `https://{dashboard}/api/telegram/webhook`, verified by
a secret token the Worker generates on first registration. On installs with
Cloudflare Access, `reconfigure` also creates a path-scoped Access
application so Telegram's servers can reach it without a session.

## Tuning

- **Include full message body** — appends the plain-text body to every
  notification, so the summary can be read without opening the dashboard
- **Per-alias mute** — the bell next to an alias in the dashboard sidebar
  mutes that alias only. Handy for noisy newsletters: mute the newsletter
  alias, keep everything else loud. The mute applies to all chats at once.

## What a notification looks like

```
📬 Jane Doe <jane@example.com>
alias: newsletter@yourdomain.com
Subject: Hello from Jane
🕐 2026-08-17 10:20 UTC

This is the snippet text…

[ Buka di Dashboard ]   ← button, opens the message
```

The message uses Telegram's HTML formatting; anything a sender writes is
escaped, so `<script>` in a subject can never render as markup. The arrival
time is UTC so every chat renders the same moment.

## Notes

- Notifications are best-effort: if Telegram is unreachable, mail delivery is
  unaffected and the message is simply not sent. One failing chat never
  blocks the others.
- With no bot token deployed, the settings page warns and nothing is sent —
  no silent half-configuration.
- Chat ids and the webhook secret are stored in your D1 database; the bot
  token only ever lives as a Worker secret.
- Quick actions (mark-as-read / archive buttons) are deliberately out of
  scope for now.