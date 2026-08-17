-- Language preference for the dashboard and Telegram notifications.
-- 'en' is the baseline; 'id' translations land later. Default keeps
-- existing installs on English.

ALTER TABLE settings ADD COLUMN language TEXT NOT NULL DEFAULT 'en';