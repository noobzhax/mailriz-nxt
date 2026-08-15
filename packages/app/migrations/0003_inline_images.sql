-- Inline images.
--
-- HTML mail embeds pictures as attachments referenced by `src="cid:<id>"`.
-- The Content-ID was never stored, so those references could not be resolved
-- and every inline image rendered broken — while the same file opened fine
-- from the attachment list.
ALTER TABLE attachments ADD COLUMN content_id TEXT NOT NULL DEFAULT '';

-- Counted at ingest so the reading pane only offers "show images" when the
-- message actually references remote ones.
ALTER TABLE emails ADD COLUMN blocked_images INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_attachments_cid ON attachments (email_id, content_id);
