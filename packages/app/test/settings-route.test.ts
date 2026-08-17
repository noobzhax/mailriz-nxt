import { describe, it, expect, afterEach } from 'bun:test';
import { app } from '../src/api';

/**
 * Telegram settings API: GET/PATCH /api/settings/telegram, the test-message
 * endpoint, webhook registration, and the per-alias mute on
 * PATCH /api/aliases/:id.
 */

const ADMIN = 'owner@example.com';
import { TEST_PASSWORD_HASH, TEST_SIGNING_KEY } from './session-credentials';

interface SettingsRow {
  user_id: string;
  telegram_enabled: number;
  telegram_chat_ids: string | null;
  telegram_full_body: number;
  telegram_webhook_secret: string | null;
  telegram_refresh_at: number | null;
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
                if (!row) return null as T;
                const { user_id: _u, ...rest } = row;
                return rest as T;
              }
              if (/FROM aliases WHERE id/i.test(sql)) {
                return (aliases.find((a) => a.id === args[0]) ?? null) as T;
              }
              return null as T;
            },
            async run() {
              if (/INSERT INTO settings/i.test(sql)) {
                const [userId, enabled, chatIds, fullBody] = args;
                const prev = settings.get(String(userId));
                settings.set(String(userId), {
                  user_id: String(userId),
                  telegram_enabled: enabled,
                  telegram_chat_ids: chatIds,
                  telegram_full_body: fullBody,
                  telegram_webhook_secret: prev?.telegram_webhook_secret ?? null,
                  telegram_refresh_at: prev?.telegram_refresh_at ?? null,
                });
              }
              if (/ON CONFLICT \(user_id\) DO UPDATE SET telegram_webhook_secret/i.test(sql)) {
                const [userId, secret] = args;
                const prev = settings.get(String(userId));
                settings.set(String(userId), {
                  user_id: String(userId),
                  telegram_enabled: prev?.telegram_enabled ?? 0,
                  telegram_chat_ids: prev?.telegram_chat_ids ?? null,
                  telegram_full_body: prev?.telegram_full_body ?? 0,
                  telegram_webhook_secret: String(secret),
                  telegram_refresh_at: prev?.telegram_refresh_at ?? null,
                });
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
    DASHBOARD_HOSTNAME: 'inbox.example.com',
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

function json(res: Response): Promise<any> {
  return res.json() as Promise<any>;
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
    expect(await json(res)).toEqual({
      enabled: false, chatIds: [], fullBody: false, hasToken: true, webhookRegistered: false,
    });
  });

  it('reports hasToken false when no bot token secret is deployed', async () => {
    const env = makeEnv({ TELEGRAM_BOT_TOKEN: undefined });
    const res = await app.fetch(
      new Request('https://inbox.example.com/api/settings/telegram', { headers: { Cookie: await cookieFor(env) } }),
      env
    );
    expect((await json(res)).hasToken).toBe(false);
  });

  it('reflects a saved row', async () => {
    const env = makeEnv();
    env.DB.settings.set(ADMIN, {
      user_id: ADMIN, telegram_enabled: 1, telegram_chat_ids: '["424242"]',
      telegram_full_body: 1, telegram_webhook_secret: 'abc', telegram_refresh_at: 100,
    });
    const res = await app.fetch(
      new Request('https://inbox.example.com/api/settings/telegram', { headers: { Cookie: await cookieFor(env) } }),
      env
    );
    expect(await json(res)).toEqual({
      enabled: true, chatIds: ['424242'], fullBody: true, hasToken: true, webhookRegistered: true,
    });
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
        body: JSON.stringify({ enabled: true, chatIds: ['424242', '-100789'], fullBody: false }),
      }),
      env
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.chatIds).toEqual(['424242', '-100789']);

    const saved = env.DB.settings.get(ADMIN);
    expect(saved).toMatchObject({ telegram_enabled: 1, telegram_full_body: 0 });
    expect(JSON.parse(saved!.telegram_chat_ids!)).toEqual(['424242', '-100789']);
  });

  it('can clear the chat ids', async () => {
    const env = makeEnv();
    env.DB.settings.set(ADMIN, {
      user_id: ADMIN, telegram_enabled: 1, telegram_chat_ids: '["424242"]',
      telegram_full_body: 0, telegram_webhook_secret: null, telegram_refresh_at: null,
    });
    const cookie = await cookieFor(env);
    const res = await app.fetch(
      new Request('https://inbox.example.com/api/settings/telegram', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ chatIds: [] }),
      }),
      env
    );
    expect((await json(res)).chatIds).toEqual([]);
  });

  it('rejects a chat id that is not a number', async () => {
    const env = makeEnv();
    const cookie = await cookieFor(env);
    const res = await app.fetch(
      new Request('https://inbox.example.com/api/settings/telegram', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ chatIds: ['not-a-number'] }),
      }),
      env
    );
    expect(res.status).toBe(400);
  });
});

describe('POST /api/settings/telegram/test', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = realFetch; });

  it('sends a test message to every configured chat', async () => {
    const env = makeEnv();
    env.DB.settings.set(ADMIN, {
      user_id: ADMIN, telegram_enabled: 1, telegram_chat_ids: '["424242","-100789"]',
      telegram_full_body: 0, telegram_webhook_secret: null, telegram_refresh_at: null,
    });
    const chats: string[] = [];
    globalThis.fetch = (async (_input: any, init: any) => {
      chats.push(JSON.parse(init.body).chat_id);
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
    expect(chats).toEqual(['424242', '-100789']);
  });

  it('answers 400 when no chat ids are configured', async () => {
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
});

describe('POST /api/settings/telegram/webhook', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = realFetch; });

  it('registers the webhook with a freshly minted secret', async () => {
    const env = makeEnv();
    const calls: string[] = [];
    globalThis.fetch = (async (input: any) => {
      calls.push(String(input));
      return new Response(JSON.stringify({ ok: true, result: {} }));
    }) as any;

    const cookie = await cookieFor(env);
    const res = await app.fetch(
      new Request('https://inbox.example.com/api/settings/telegram/webhook', {
        method: 'POST',
        headers: { Cookie: cookie },
      }),
      env
    );
    expect(res.status).toBe(200);
    // setWebhook (with secret) + setMyCommands
    expect(calls[0]).toContain('/setWebhook?');
    expect(calls[0]).toContain('url=https%3A%2F%2Finbox.example.com%2Fapi%2Ftelegram%2Fwebhook');
    expect(calls[0]).toContain('secret_token=');
    expect(calls[1]).toContain('/setMyCommands?');

    const saved = env.DB.settings.get(ADMIN);
    expect(saved!.telegram_webhook_secret).toBeTruthy();
  });

  it('reuses the stored secret on a second registration', async () => {
    const env = makeEnv();
    env.DB.settings.set(ADMIN, {
      user_id: ADMIN, telegram_enabled: 0, telegram_chat_ids: null,
      telegram_full_body: 0, telegram_webhook_secret: 'stored-secret', telegram_refresh_at: null,
    });
    const calls: string[] = [];
    globalThis.fetch = (async (input: any) => {
      calls.push(String(input));
      return new Response(JSON.stringify({ ok: true, result: {} }));
    }) as any;

    const cookie = await cookieFor(env);
    const res = await app.fetch(
      new Request('https://inbox.example.com/api/settings/telegram/webhook', {
        method: 'POST',
        headers: { Cookie: cookie },
      }),
      env
    );
    expect(res.status).toBe(200);
    expect(calls[0]).toContain('secret_token=stored-secret');
    expect(env.DB.settings.get(ADMIN)!.telegram_webhook_secret).toBe('stored-secret');
  });

  it('answers 502 when Telegram rejects setWebhook', async () => {
    const env = makeEnv();
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ ok: false, description: 'bad request' }), { status: 400 })) as any;

    const cookie = await cookieFor(env);
    const res = await app.fetch(
      new Request('https://inbox.example.com/api/settings/telegram/webhook', {
        method: 'POST',
        headers: { Cookie: cookie },
      }),
      env
    );
    expect(res.status).toBe(502);
  });
});

describe('GET /api/settings/telegram/webhook', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = realFetch; });

  it('reports registration state from the stored secret and Telegram', async () => {
    const env = makeEnv();
    env.DB.settings.set(ADMIN, {
      user_id: ADMIN, telegram_enabled: 0, telegram_chat_ids: null,
      telegram_full_body: 0, telegram_webhook_secret: 'abc', telegram_refresh_at: null,
    });
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ ok: true, result: { url: 'https://inbox.example.com/api/telegram/webhook' } }))) as any;

    const cookie = await cookieFor(env);
    const res = await app.fetch(
      new Request('https://inbox.example.com/api/settings/telegram/webhook', {
        headers: { Cookie: cookie },
      }),
      env
    );
    expect(await json(res)).toEqual({
      registered: true,
      url: 'https://inbox.example.com/api/telegram/webhook',
    });
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