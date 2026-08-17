-- Telegram email notifications.
--
-- A singleton settings row per user (the service is single-user, so in
-- practice one row keyed by the admin email) holds the global Telegram
-- switches; aliases gain a per-alias mute so noisy senders can be silenced
-- without touching the global switch.

CREATE TABLE IF NOT EXISTS settings (
  user_id             TEXT PRIMARY KEY,
  telegram_enabled    INTEGER NOT NULL DEFAULT 0,
  telegram_chat_id    TEXT,
  telegram_full_body  INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE aliases ADD COLUMN telegram_muted INTEGER NOT NULL DEFAULT 0;