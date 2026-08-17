---
title: What's different from upstream
description: MailRiz NXT is a fork — this page lists what it adds and what changed relative to the original MailRiz.
---

MailRiz NXT is a fork of the original [MailRiz](https://github.com/rizkirmdhnnn/mailriz), built on the same Cloudflare stack. Most of this documentation describes both faithfully; this page is the list of what NXT adds or changes.

## New feature: Telegram notifications

The headline addition: **every incoming email can push a notification to a
Telegram chat** — sender, subject, snippet, and a link back to the message.
See [Telegram notifications](/mailriz-nxt/en/guides/telegram-notifications/).

- The bot token is a Worker **secret** deployed by the CLI
- Any number of **chat ids** (comma-separated) receive each notification;
  toggles and chat ids live in the dashboard **Settings** page
- Each alias can be **muted individually** with the bell in the sidebar
- The bot answers **`/refresh`** — an open dashboard tab refetches instantly
  (webhook registered from the Settings page)

## CLI package

The CLI is published as **`mailriz-cli-nxt`** instead of `mailriz-cli` (the
upstream name belongs to the original publisher). Install and run it the same
way:

```bash
bunx mailriz-cli-nxt@latest setup
bunx mailriz-cli-nxt@latest reconfigure
```

Everything else about the CLI is unchanged — same commands, same
`~/.mailriz/config.json`, same wizard.

## Release source

The CLI downloads the Worker bundle from **this fork's GitHub Releases**
(`noobzhax/mailriz-nxt`), not from the upstream repository. That is what makes
a `setup` or `reconfigure` here deploy the fork's Worker — including the
Telegram feature and its database migration. Upstream's releases do not
contain them.

## Documentation

This site is deployed from the fork to `noobzhax.github.io/mailriz-nxt`.
Upstream's documentation site is separate and does not cover the Telegram
feature or this package name.

## What is the same

Everything else is shared upstream: the catch-all aliases, folders, labels,
search, the raw-email storage model (your data in your own R2 and D1), the
Cloudflare Access / session-password authentication, the `update` and
`destroy` commands, and the platform limits.