import { describe, it, expect, afterEach } from 'bun:test';
import {
  shouldNotify, buildTelegramMessage, sendTelegramMessage, parseChatIds, escapeHtml,
} from '../src/lib/telegram';

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

const ENABLED = { telegram_enabled: 1, telegram_chat_ids: '["123456","-100789"]', telegram_full_body: 0 };

describe('parseChatIds', () => {
  it('reads a JSON array of chat ids', () => {
    expect(parseChatIds('["123456","-100789"]')).toEqual(['123456', '-100789']);
  });

  it('returns [] for null or garbage', () => {
    expect(parseChatIds(null)).toEqual([]);
    expect(parseChatIds('not json')).toEqual([]);
  });

  it('drops non-numeric entries', () => {
    expect(parseChatIds('["123456","nope","abc"]')).toEqual(['123456']);
  });
});

describe('shouldNotify', () => {
  it('is silent while the feature is disabled', () => {
    expect(shouldNotify({ ...ENABLED, telegram_enabled: 0 }, { telegram_muted: 0 })).toBe(false);
  });

  it('is silent when no chat id is configured', () => {
    expect(shouldNotify({ ...ENABLED, telegram_chat_ids: null }, { telegram_muted: 0 })).toBe(false);
    expect(shouldNotify({ ...ENABLED, telegram_chat_ids: '[]' }, { telegram_muted: 0 })).toBe(false);
  });

  it('is silent for a muted alias', () => {
    expect(shouldNotify(ENABLED, { telegram_muted: 1 })).toBe(false);
  });

  it('fires when configured, unmuted, and enabled', () => {
    expect(shouldNotify(ENABLED, { telegram_muted: 0 })).toBe(true);
  });
});

describe('escapeHtml', () => {
  it('escapes the characters Telegram HTML treats as markup', () => {
    expect(escapeHtml('<b>a&b</b> "q"')).toBe('&lt;b&gt;a&amp;b&lt;/b&gt; "q"');
  });
});

describe('buildTelegramMessage', () => {
  const base = {
    fromName: 'Jane <Doe>',
    fromAddress: 'jane@example.com',
    localPart: 'newsletter',
    domain: 'rizpedia.com',
    subject: 'Hello & welcome',
    snippet: 'This is the snippet.',
    bodyText: 'Full body with <script>alert(1)</script>',
    fullBody: false,
    dashboardHostname: 'inbox.rizpedia.com',
    emailId: '01ABC',
  };

  it('builds HTML markup with bold sender and subject, escaped content', () => {
    const msg = buildTelegramMessage(base);
    expect(msg).toContain('<b>Jane &lt;Doe&gt;</b>');
    expect(msg).toContain('<code>newsletter@rizpedia.com</code>');
    expect(msg).toContain('<b>Hello &amp; welcome</b>');
    expect(msg).toContain('This is the snippet.');
    // The deep link moved to the button; the text must not carry a raw URL.
    expect(msg).not.toContain('https://');
  });

  it('escapes the full body when included', () => {
    const msg = buildTelegramMessage({ ...base, fullBody: true });
    expect(msg).toContain('&lt;script&gt;');
    expect(msg).not.toContain('<script>alert');
  });

  it('caps the message at the Telegram limit', () => {
    const msg = buildTelegramMessage({ ...base, fullBody: true, bodyText: 'x'.repeat(5000) });
    expect(msg.length).toBeLessThanOrEqual(4096);
  });

  it('omits the subject line when there is none', () => {
    const msg = buildTelegramMessage({ ...base, subject: '' });
    expect(msg).not.toContain('Subject:');
  });

  it('renders the received time as a UTC timestamp line', () => {
    const msg = buildTelegramMessage({ ...base, receivedAt: 1723884000 });
    expect(msg).toContain('🕐 2024-08-17 08:40 UTC');
    expect(msg.indexOf('🕐')).toBeLessThan(msg.indexOf('This is the snippet.'));
  });

  it('omits the timestamp when arrival time is unknown', () => {
    const msg = buildTelegramMessage(base);
    expect(msg).not.toContain('🕐');
  });
});

describe('sendTelegramMessage', () => {
  const env = { TELEGRAM_BOT_TOKEN: 'tok:secret' } as any;

  it('posts HTML text with an open-in-dashboard button and reports success', async () => {
    let called = false;
    globalThis.fetch = (async (input: any, init: any) => {
      called = true;
      expect(String(input)).toBe('https://api.telegram.org/bottok:secret/sendMessage');
      const body = JSON.parse(init.body);
      expect(body.chat_id).toBe('123456');
      expect(body.text).toContain('<b>Hello</b>');
      expect(body.parse_mode).toBe('HTML');
      expect(body.reply_markup.inline_keyboard[0][0].text).toBe('Buka di Dashboard');
      expect(body.reply_markup.inline_keyboard[0][0].url).toBe('https://inbox.rizpedia.com/inbox/01ABC');
      return new Response(JSON.stringify({ ok: true }));
    }) as any;

    const ok = await sendTelegramMessage(env, '123456', '<b>Hello</b>', {
      buttonUrl: 'https://inbox.rizpedia.com/inbox/01ABC',
    });
    expect(ok).toEqual({ ok: true });
    expect(called).toBe(true);
  });

  it('sends plain text without markup when no button is given', async () => {
    globalThis.fetch = (async (_input: any, init: any) => {
      const body = JSON.parse(init.body);
      expect(body.parse_mode).toBeUndefined();
      expect(body.reply_markup).toBeUndefined();
      return new Response(JSON.stringify({ ok: true }));
    }) as any;
    expect(await sendTelegramMessage(env, '123456', 'plain')).toEqual({ ok: true });
  });

  it('reports failure with Telegram\'s own error text', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ ok: false, description: 'chat not found' }), { status: 400 })) as any;
    expect(await sendTelegramMessage(env, '999', 'Hello')).toEqual({ ok: false, error: 'chat not found' });
  });

  it('reports failure when the network throws', async () => {
    globalThis.fetch = (async () => {
      throw new Error('boom');
    }) as any;
    expect(await sendTelegramMessage(env, '999', 'Hello')).toEqual({ ok: false, error: 'boom' });
  });

  it('does nothing without a bot token', async () => {
    let called = false;
    globalThis.fetch = (async () => {
      called = true;
      return new Response(JSON.stringify({ ok: true }));
    }) as any;
    expect(await sendTelegramMessage({} as any, '999', 'Hello')).toEqual({ ok: false, error: 'No bot token deployed' });
    expect(called).toBe(false);
  });
});