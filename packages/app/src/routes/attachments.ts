import { Hono } from 'hono';
import { AppContext } from '../types';

export const attachmentRoutes = new Hono<AppContext>();

/** Types that may be served inline; everything else downloads. */
const INLINE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/avif',
]);

attachmentRoutes.get('/:id', async (c) => {
  const e = c.env;
  const id = c.req.param('id');
  const row = await e.DB.prepare('SELECT r2_key, filename, content_type, size_bytes FROM attachments WHERE id = ?1')
    .bind(id)
    .first<{ r2_key: string; filename: string; content_type: string; size_bytes: number }>();
  if (!row) return c.json({ error: 'Not found' }, 404);

  const obj = await e.ATTACHMENTS_BUCKET.get(row.r2_key);
  if (!obj) return c.json({ error: 'Not found' }, 404);

  // Safe Content-Disposition.
  const safeName = (row.filename || 'attachment').replace(/[^\w.\- ]+/g, '_').slice(0, 120) || 'attachment';
  const encoded = encodeURIComponent(safeName);

  // Inline rendering is only for raster images referenced by the message body
  // (src="cid:…"). SVG is deliberately excluded — it can carry script, and
  // serving it inline would hand it the dashboard's origin.
  const inlineOk = INLINE_TYPES.has((row.content_type || '').toLowerCase().split(';')[0]!.trim());
  const inline = c.req.query('inline') === '1' && inlineOk;

  return new Response(obj.body, {
    headers: {
      'Content-Type': row.content_type || 'application/octet-stream',
      'Content-Disposition': inline
        ? `inline; filename="${safeName}"; filename*=UTF-8''${encoded}`
        : `attachment; filename="${safeName}"; filename*=UTF-8''${encoded}`,
      'Content-Length': String(row.size_bytes),
      // Never let a stored attachment be interpreted as something else.
      'X-Content-Type-Options': 'nosniff',
    },
  });
});
