import { describe, it, expect, afterEach } from 'bun:test';
import { shouldNotify, buildTelegramMessage, sendTelegramMessage } from '../src/lib/telegram';

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

const ENABLED = { telegram_enabled: 1, telegram_chat_id: '123456', telegram_full_body: 0 };

describe('shouldNotify', () => {
  it('is silent while the feature is disabled', () => {
    expect(shouldNotify({ ...ENABLED, telegram_enabled: 0 }, { telegram_muted: 0 })).toBe(false);
  });

  it('is silent when no chat id is configured', () => {
    expect(shouldNotify({ ...ENABLED, telegram_chat_id: null }, { telegram_muted: 0 })).toBe(false);
  });

  it('is silent for a muted alias', () => {
    expect(shouldNotify(ENABLED, { telegram_muted: 1 })).toBe(false);
  });

  it('fires when configured, unmuted, and enabled', () => {
    expect(shouldNotify(ENABLED, { telegram_muted: 0 })).toBe(true);
  });
});

describe('buildTelegramMessage', () => {
  const base = {
    fromName: 'Jane Doe',
    fromAddress: 'jane@example.com',
    localPart: 'newsletter',
    domain: 'rizpedia.com',
    subject: 'Hello from Jane',
    snippet: 'This is the snippet text.',
    bodyText: 'The full body text that should not appear by default.',
    fullBody: false,
    dashboardHostname: 'inbox.rizpedia.com',
    emailId: '01ABC',
  };

  it('shows sender, alias, subject, snippet, and a deep link', () => {
    const msg = buildTelegramMessage(base);
    expect(msg).toContain('📬 Jane Doe <jane@example.com>');
    expect(msg).toContain('newsletter@rizpedia.com');
    expect(msg).toContain('Hello from Jane');
    expect(msg).toContain('This is the snippet text.');
    expect(msg).toContain('https://inbox.rizpedia.com/inbox/01ABC');
    expect(msg).not.toContain('The full body text');
  });

  it('falls back to the bare address when the sender has no name', () => {
    const msg = buildTelegramMessage({ ...base, fromName: '' });
    expect(msg).toContain('📬 jane@example.com');
    expect(msg).not.toContain('<jane@example.com>');
  });

  it('includes the full body when asked', () => {
    const msg = buildTelegramMessage({ ...base, fullBody: true });
    expect(msg).toContain('The full body text that should not appear by default.');
  });

  it('caps the message at the Telegram limit', () => {
    const msg = buildTelegramMessage({ ...base, fullBody: true, bodyText: 'x'.repeat(5000) });
    expect(msg.length).toBeLessThanOrEqual(4096);
  });
});

describe('sendTelegramMessage', () => {
  const env = { TELEGRAM_BOT_TOKEN: 'tok:secret' } as any;

  it('posts to the bot API and reports success', async () => {
    let called = false;
    globalThis.fetch = (async (input: any, init: any) => {
      called = true;
      expect(String(input)).toBe('https://api.telegram.org/bottok:secret/sendMessage');
      const body = JSON.parse(init.body);
      expect(body.chat_id).toBe('123456');
      expect(body.text).toContain('Hello');
      return new Response(JSON.stringify({ ok: true }));
    }) as any;

    expect(await sendTelegramMessage(env, '123456', 'Hello')).toEqual({ ok: true });
    expect(called).toBe(true);
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