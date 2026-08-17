---
title: Telegram notifications
description: Get a Telegram message the moment mail arrives — with a link straight to the message.
---

When a new email lands, MailRiz can send a notification to a Telegram chat:
the sender, the subject, a short snippet, and a link that opens the message
in the dashboard. Optionally, the full plain-text body rides along (capped at
4096 characters, Telegram's message limit).

## What you need

- A Telegram bot — create one with **@BotFather** and keep the token it gives you
- The chat id of the chat the bot should write into (see below)
- Telegram notifications deployed on your install (one command, below)

## Deploy the bot token

The bot token is a Worker secret, so it goes in through the CLI:

```bash
bunx mailriz-cli-nxt@latest reconfigure
```

When the wizard asks for the **Telegram bot token**, paste it (or leave it
empty to skip). The token can also be added or replaced later with the same
command — a skipped prompt clears a previously deployed token.

## Find your chat id

A chat id only exists once you have messaged the bot: open the chat with your
bot in Telegram and send it anything (a `/start` works). Then ask
**@userinfobot** to tell you the id of that chat — it replies with a number,
positive for a private chat, negative for a group.

## Switch it on

Open **Settings → Telegram** in the dashboard:

1. Paste the chat id and press **Save**
2. Turn on **Receive new-mail notifications**
3. Press **Send test message** — a test message should appear in the chat
   immediately

If the test fails, the settings page shows Telegram's own error text — the
two usual causes are a chat id typo, or the bot not being able to message
that chat (a group needs the bot added as a member first).

## Tuning

- **Include full message body** — appends the plain-text body to every
  notification, so the summary can be read without opening the dashboard
- **Per-alias mute** — the bell next to an alias in the dashboard sidebar
  mutes that alias only. Handy for noisy newsletters: mute the newsletter
  alias, keep everything else loud

## What a notification looks like

```
📬 Jane Doe <jane@example.com>
alias: newsletter@yourdomain.com
Subject: Hello from Jane
This is the snippet text…
🔗 https://inbox.yourdomain.com/inbox/01ABC…
```

## Notes

- Notifications are best-effort: if Telegram is unreachable, mail delivery is
  unaffected and the message is simply not sent.
- With no bot token deployed, the settings page warns and nothing is sent —
  no silent half-configuration.
- Chat ids are stored in your D1 database; the bot token only ever lives as
  a Worker secret.