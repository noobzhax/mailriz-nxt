import { describe, it, expect } from 'bun:test';
import { app } from '../src/api';

/**
 * Inline image rendering.
 *
 * HTML mail embeds pictures as attachments referenced by src="cid:<id>".
 * The sanitizer neutralises every <img src> into data-blocked-src, so the
 * stored HTML renders nothing at all. Serving it has to put two things back:
 *
 *  - cid: references, always — they point at the message's own attachments
 *    and cost no privacy. Missing this is what made inline images render
 *    broken while the same file opened fine from the attachment list.
 *  - remote URLs, only when explicitly asked (?images=1).
 */

const ADMIN = 'owner@example.com';
// sha256("hunter2")
const HASH = 'f52fbd32b2b3b86ff88ef6c490628285f482af15ddcb29541f94bcf526a3f6c7';

const STORED_HTML =
  '<p>hi</p>' +
  '<img data-blocked-src="cid:logo@mail.local">' +
  '<img data-blocked-src="https://tracker.example/pixel.gif?a=1&amp;b=2">';

function makeEnv(attachments: { id: string; content_id: string }[]) {
  return {
    AUTH_MODE: 'session',
    ADMIN_EMAIL: ADMIN,
    SESSION_PASSWORD_HASH: HASH,
    HTML_BUCKET: {
      async get() {
        return { async text() { return STORED_HTML; }, body: null };
      },
    },
    DB: {
      prepare(sql: string) {
        return {
          _args: [] as any[],
          bind(...args: any[]) { this._args = args; return this; },
          async first<T>() {
            if (/html_r2_key FROM emails/i.test(sql)) return { html_r2_key: 'k' } as T;
            return null as T;
          },
          async all<T>() {
            if (/FROM attachments/i.test(sql)) return { results: attachments } as any;
            return { results: [] } as any;
          },
          async run() { return { success: true }; },
        };
      },
    },
  } as any;
}

async function cookieFor(env: any): Promise<string> {
  const res = await app.fetch(
    new Request('https://inbox.example.com/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN, password: 'hunter2' }),
    }),
    env
  );
  return (res.headers.get('Set-Cookie') || '').split(';')[0]!;
}

async function fetchHtml(env: any, query = ''): Promise<string> {
  const cookie = await cookieFor(env);
  const res = await app.fetch(
    new Request(`https://inbox.example.com/api/emails/e1/html${query}`, { headers: { Cookie: cookie } }),
    env
  );
  expect(res.status).toBe(200);
  return res.text();
}

describe('serving message HTML', () => {
  it('resolves cid: references to the attachment that carries them', async () => {
    const env = makeEnv([{ id: 'att1', content_id: 'logo@mail.local' }]);
    const html = await fetchHtml(env);

    expect(html).toContain('src="/api/attachments/att1?inline=1"');
    expect(html).not.toContain('cid:logo@mail.local');
  });

  it('matches the Content-ID case-insensitively', async () => {
    const env = makeEnv([{ id: 'att1', content_id: 'LOGO@Mail.Local'.toLowerCase() }]);
    expect(await fetchHtml(env)).toContain('src="/api/attachments/att1?inline=1"');
  });

  it('leaves a cid: with no matching attachment blocked', async () => {
    const env = makeEnv([{ id: 'att1', content_id: 'something-else' }]);
    const html = await fetchHtml(env);

    // Better a missing image than a request to a URL we cannot resolve.
    expect(html).toContain('data-blocked-src="cid:logo@mail.local"');
    expect(html).not.toContain('/api/attachments/att1');
  });

  it('keeps remote images blocked by default', async () => {
    const env = makeEnv([{ id: 'att1', content_id: 'logo@mail.local' }]);
    const html = await fetchHtml(env);

    expect(html).toContain('data-blocked-src="https://tracker.example/pixel.gif?a=1&amp;b=2"');
    // Anchored on the tag: "data-blocked-src=" itself ends in `src="`.
    expect(html).not.toContain('<img src="https://tracker.example');
  });

  it('restores remote images only when asked, preserving the escaped URL', async () => {
    const env = makeEnv([{ id: 'att1', content_id: 'logo@mail.local' }]);
    const html = await fetchHtml(env, '?images=1');

    // The entity stays escaped — it is going back into an HTML attribute.
    expect(html).toContain('<img src="https://tracker.example/pixel.gif?a=1&amp;b=2"');
    expect(html).not.toContain('data-blocked-src="https');
    // Inline images resolve regardless of the flag.
    expect(html).toContain('src="/api/attachments/att1?inline=1"');
  });

  it('is never cached, since blocking depends on the query', async () => {
    const env = makeEnv([]);
    const cookie = await cookieFor(env);
    const res = await app.fetch(
      new Request('https://inbox.example.com/api/emails/e1/html', { headers: { Cookie: cookie } }),
      env
    );
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });
});
