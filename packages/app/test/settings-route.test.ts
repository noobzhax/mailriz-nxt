import { describe, it, expect, afterEach } from 'bun:test';
import { app } from '../src/api';

/**
 * Telegram settings API: GET/PATCH /api/settings/telegram, the test-message
 * endpoint, and the per-alias mute on PATCH /api/aliases/:id.
 */

const ADMIN = 'owner@example.com';
import { TEST_PASSWORD_HASH, TEST_SIGNING_KEY } from './session-credentials';

interface SettingsRow {
  user_id: string;
  telegram_enabled: number;
  telegram_chat_id: string | null;
  telegram_full_body: number;
}

/** In-memory D1: one settings row + a small alias table. */
function makeEnv(overrides: Record<string, unknown> = {}) {
  const settings = new Map<string, SettingsRow>();
  const aliases: any[] = [{ id: 'alias-1', user_id: ADMIN, telegram_muted: 0 }];
  const db = {
    settings,
    aliases,
    prepare(sql: string) {
      return {
        bind(...args: any[]) {
          return {
            async first<T>() {
              if (/FROM settings/i.test(sql)) {
                const row = settings.get(String(args[0]));
                return row ? { telegram_enabled: row.telegram_enabled, telegram_chat_id: row.telegram_chat_id, telegram_full_body: row.telegram_full_body } as T : null;
              }
              if (/FROM aliases WHERE id/i.test(sql)) {
                return (aliases.find((a) => a.id === args[0]) ?? null) as T;
              }
              return null as T;
            },
            async run() {
              if (/INSERT INTO settings/i.test(sql)) {
                const [userId, enabled, chatId, fullBody] = args;
                settings.set(String(userId), { user_id: String(userId), telegram_enabled: enabled, telegram_chat_id: chatId, telegram_full_body: fullBody });
              }
              if (/UPDATE aliases/i.test(sql)) {
                const target = aliases.find((a) => a.id === args[args.length - 2]);
                if (target) {
                  const keys: string[] = sql.match(/(\w+)\s*=\s*\?/g) || [];
                  for (const k of keys) {
                    const col = k.split('=')[0]!.trim();
                    target[col] = args[keys.indexOf(k)];
                  }
                }
              }
              return { success: true };
            },
            async all() { return { results: [] }; },
          };
        },
      };
    },
  };
  return {
    DB: db,
    AUTH_MODE: 'session',
    ADMIN_EMAIL: ADMIN,
    SESSION_PASSWORD_HASH: TEST_PASSWORD_HASH,
    SESSION_SIGNING_KEY: TEST_SIGNING_KEY,
    TELEGRAM_BOT_TOKEN: 'tok:secret',
    ...overrides,
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
  expect(res.status).toBe(200);
  return (res.headers.get('Set-Cookie') || '').split(';')[0]!;
}

function api(env: any, path: string, cookie: string, init: RequestInit = {}) {
  return app.fetch(
    new Request(`https://inbox.example.com${path}`, {
      ...init,
      headers: { ...(init.headers || {}), Cookie: cookie },
    }),
    env
  );
}

describe('GET /api/settings/telegram', () => {
  it('requires authentication like every other /api route', async () => {
    const res = await app.fetch(new Request('https://inbox.example.com/api/settings/telegram'), makeEnv());
    expect(res.status).toBe(401);
  });

  it('returns safe defaults when nothing is configured', async () => {
    const env = makeEnv();
    const res = await app.fetch(
      new Request('https://inbox.example.com/api/settings/telegram', { headers: { Cookie: await cookieFor(env) } }),
      env
    );
    expect(await (res.json() as Promise<any>)).toEqual({ enabled: false, chatId: null, fullBody: false, hasToken: true });
  });

  it('reports hasToken false when no bot token secret is deployed', async () => {
    const env = makeEnv({ TELEGRAM_BOT_TOKEN: undefined });
    const res = await app.fetch(
      new Request('https://inbox.example.com/api/settings/telegram', { headers: { Cookie: await cookieFor(env) } }),
      env
    );
    expect((await (res.json() as Promise<any>)).hasToken).toBe(false);
  });

  it('reflects a saved row', async () => {
    const env = makeEnv();
    env.DB.settings.set(ADMIN, { user_id: ADMIN, telegram_enabled: 1, telegram_chat_id: '424242', telegram_full_body: 1 });
    const res = await app.fetch(
      new Request('https://inbox.example.com/api/settings/telegram', { headers: { Cookie: await cookieFor(env) } }),
      env
    );
    expect(await (res.json() as Promise<any>)).toEqual({ enabled: true, chatId: '424242', fullBody: true, hasToken: true });
  });
});

describe('PATCH /api/settings/telegram', () => {
  it('saves and returns the updated settings', async () => {
    const env = makeEnv();
    const cookie = await cookieFor(env);
    const res = await app.fetch(
      new Request('https://inbox.example.com/api/settings/telegram', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ enabled: true, chatId: '424242', fullBody: false }),
      }),
      env
    );
    expect(res.status).toBe(200);
    expect(await (res.json() as Promise<any>)).toEqual({ enabled: true, chatId: '424242', fullBody: false, hasToken: true });

    const saved = env.DB.settings.get(ADMIN);
    expect(saved).toMatchObject({ telegram_enabled: 1, telegram_chat_id: '424242', telegram_full_body: 0 });
  });

  it('can clear the chat id', async () => {
    const env = makeEnv();
    env.DB.settings.set(ADMIN, { user_id: ADMIN, telegram_enabled: 1, telegram_chat_id: '424242', telegram_full_body: 0 });
    const cookie = await cookieFor(env);
    const res = await app.fetch(
      new Request('https://inbox.example.com/api/settings/telegram', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ chatId: '' }),
      }),
      env
    );
    expect((await (res.json() as Promise<any>)).chatId).toBeNull();
  });

  it('rejects a chat id that is not a number', async () => {
    const env = makeEnv();
    const cookie = await cookieFor(env);
    const res = await app.fetch(
      new Request('https://inbox.example.com/api/settings/telegram', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ chatId: 'not-a-number' }),
      }),
      env
    );
    expect(res.status).toBe(400);
  });
});

describe('POST /api/settings/telegram/test', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = realFetch; });

  it('sends a test message to the configured chat', async () => {
    const env = makeEnv();
    env.DB.settings.set(ADMIN, { user_id: ADMIN, telegram_enabled: 1, telegram_chat_id: '424242', telegram_full_body: 0 });
    let called = false;
    globalThis.fetch = (async (input: any, init: any) => {
      called = true;
      expect(String(input)).toContain('/bottok:secret/sendMessage');
      expect(JSON.parse(init.body).chat_id).toBe('424242');
      return new Response(JSON.stringify({ ok: true }));
    }) as any;

    const cookie = await cookieFor(env);
    const res = await app.fetch(
      new Request('https://inbox.example.com/api/settings/telegram/test', {
        method: 'POST',
        headers: { Cookie: cookie },
      }),
      env
    );
    expect(res.status).toBe(200);
    expect(called).toBe(true);
  });

  it('answers 400 when no chat id is configured', async () => {
    const env = makeEnv();
    const cookie = await cookieFor(env);
    const res = await app.fetch(
      new Request('https://inbox.example.com/api/settings/telegram/test', {
        method: 'POST',
        headers: { Cookie: cookie },
      }),
      env
    );
    expect(res.status).toBe(400);
  });

  it('answers 502 when Telegram rejects the message', async () => {
    const env = makeEnv();
    env.DB.settings.set(ADMIN, { user_id: ADMIN, telegram_enabled: 1, telegram_chat_id: '999', telegram_full_body: 0 });
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ ok: false, description: 'chat not found' }), { status: 400 })) as any;

    const cookie = await cookieFor(env);
    const res = await app.fetch(
      new Request('https://inbox.example.com/api/settings/telegram/test', {
        method: 'POST',
        headers: { Cookie: cookie },
      }),
      env
    );
    expect(res.status).toBe(502);
  });
});

describe('PATCH /api/aliases/:id telegram_muted', () => {
  it('mutes and unmutes an alias', async () => {
    const env = makeEnv();
    const cookie = await cookieFor(env);
    const res = await app.fetch(
      new Request('https://inbox.example.com/api/aliases/alias-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ telegram_muted: 1 }),
      }),
      env
    );
    expect(res.status).toBe(200);
    expect(env.DB.aliases[0]!.telegram_muted).toBe(1);
  });
});
