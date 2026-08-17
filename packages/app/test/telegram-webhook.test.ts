import { describe, it, expect } from 'bun:test';
import { app } from '../src/api';

/**
 * The Telegram bot webhook — public, authenticated by the
 * X-Telegram-Bot-Api-Secret-Token header. /refresh from a configured chat
 * writes the marker the SSE stream watches.
 */

const ADMIN = 'owner@example.com';

function makeEnv() {
  const settings = new Map<string, any>([
    [ADMIN, {
      user_id: ADMIN,
      telegram_webhook_secret: 'topsecret',
      telegram_chat_ids: '["424242"]',
    }],
  ]);
  const refreshes: number[] = [];
  return {
    DB: {
      prepare(sql: string) {
        return {
          bind(...args: any[]) {
            return {
              async first<T>() {
                if (/FROM settings/i.test(sql)) {
                  const row = settings.get(String(args[0]));
                  if (!row) return null as T;
                  const { user_id: _u, ...rest } = row;
                  return rest as T;
                }
                return null as T;
              },
              async run() {
                if (/UPDATE settings SET telegram_refresh_at/i.test(sql)) {
                  refreshes.push(args[0]);
                }
                return { success: true };
              },
              async all() { return { results: [] }; },
            };
          },
        };
      },
    },
    ADMIN_EMAIL: ADMIN,
    TELEGRAM_BOT_TOKEN: 'tok:secret',
    refreshes,
  } as any;
}

function webhook(env: any, body: unknown, secret = 'topsecret') {
  return app.fetch(
    new Request('https://inbox.example.com/api/telegram/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Bot-Api-Secret-Token': secret,
      },
      body: JSON.stringify(body),
    }),
    env
  );
}

describe('webhook authentication', () => {
  it('answers 403 without the secret header', async () => {
    const res = await webhook(makeEnv(), { message: { text: '/refresh', chat: { id: 424242 } } }, '');
    expect(res.status).toBe(403);
  });

  it('answers 403 with a wrong secret', async () => {
    const res = await webhook(makeEnv(), { message: { text: '/refresh', chat: { id: 424242 } } }, 'wrong');
    expect(res.status).toBe(403);
  });

  it('answers 403 when no webhook was ever registered', async () => {
    const env = makeEnv();
    env.DB.prepare = () => ({
      bind() { return this; },
      async first() { return null; },
      async run() { return { success: true }; },
      async all() { return { results: [] }; },
    });
    const res = await webhook(env, { message: { text: '/refresh', chat: { id: 424242 } } }, 'topsecret');
    expect(res.status).toBe(403);
  });
});

describe('/refresh command', () => {
  it('writes the refresh marker and acknowledges', async () => {
    const env = makeEnv();
    let replied = false;
    globalThis.fetch = (async (input: any, init: any) => {
      if (String(input).includes('/sendMessage')) {
        replied = true;
        expect(JSON.parse(init.body).text).toContain('Memeriksa inbox');
      }
      return new Response(JSON.stringify({ ok: true }));
    }) as any;

    const res = await webhook(env, { message: { text: '/refresh', chat: { id: 424242 } } });
    expect(res.status).toBe(200);
    expect(env.refreshes).toHaveLength(1);
    expect(replied).toBe(true);
  });

  it('ignores commands from chats that are not configured', async () => {
    const env = makeEnv();
    const res = await webhook(env, { message: { text: '/refresh', chat: { id: 999 } } });
    expect(res.status).toBe(200);
    expect(env.refreshes).toHaveLength(0);
  });

  it('ignores other messages and edited updates', async () => {
    const env = makeEnv();
    await webhook(env, { message: { text: 'hello', chat: { id: 424242 } } });
    await webhook(env, { edited_message: { text: '/refresh', chat: { id: 424242 } } });
    expect(env.refreshes).toHaveLength(0);
  });

  it('accepts /refresh@BotName mentions', async () => {
    const env = makeEnv();
    const res = await webhook(env, { message: { text: '/refresh@mailriz_bot', chat: { id: 424242 } } });
    expect(res.status).toBe(200);
    expect(env.refreshes).toHaveLength(1);
  });
});