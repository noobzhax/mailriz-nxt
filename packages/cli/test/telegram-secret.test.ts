import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Telegram bot token handling in the CLI.
 *
 * The wizard cannot be driven interactively in a unit test, so — like
 * prompt-masking.test.ts — these read the source and pin the shape of the
 * secret deploy and the prompt. Crude, but they fail if the token starts
 * being handled in the clear or stops reaching the Worker.
 */
const src = readFileSync(join(import.meta.dir, '../src/cli.ts'), 'utf8');

describe('telegram secret deploy', () => {
  it('pushes the bot token through wrangler secret bulk as TELEGRAM_BOT_TOKEN', () => {
    // The payload must name the Worker binding the app reads from.
    expect(src).toMatch(/TELEGRAM_BOT_TOKEN:\s*opts\.botToken/);
    expect(src).toContain("runWrangler(['secret', 'bulk']");
  });

  it('clears a previously deployed token when the operator skips the prompt', () => {
    // A skipped prompt must not leave the old secret in place; the empty
    // string is the Worker-side "no token" signal.
    expect(src).toMatch(/botToken\s*\|\|\s*''/);
  });
});

describe('telegram prompt', () => {
  it('asks for the bot token with a masked prompt', () => {
    const masked = /await password\(\{[\s\S]*?Telegram bot token[\s\S]*?\}\)/;
    expect(src).toMatch(masked);
  });

  it('allows skipping — the token is optional', () => {
    // Empty answer must be legal (no validate() rejecting it).
    expect(src).toMatch(/empty to skip/);
  });

  it('validates the token shape when one is typed', () => {
    // Telegram tokens are <bot id>:<secret>; a typo should be caught here
    // rather than surfacing as a mystery dashboard failure.
    expect(src).toContain('^\\d+:[A-Za-z0-9_-]+$');
  });
});

describe('telegram webhook access bypass', () => {
  const cfSrc = readFileSync(join(import.meta.dir, '../src/cf.ts'), 'utf8');

  it('creates a path-scoped Access application for the webhook path', () => {
    expect(src).toContain("paths: [{ path: '/api/telegram/webhook' }]");
  });

  it('gives it a Bypass → Everyone policy', () => {
    expect(cfSrc).toContain("decision: 'bypass'");
    expect(cfSrc).toContain('everyone');
  });

  it('never mistakes the bypass app for the guarding app', () => {
    expect(src).toContain('TELEGRAM_WEBHOOK_APP_NAME');
    expect(src).toContain('a.name !== TELEGRAM_WEBHOOK_APP_NAME');
  });
});

describe('telegram in status and config', () => {
  it('reports whether a token is stored without printing it', () => {
    expect(src).toMatch(/\['telegram',\s*cfg\.telegram_bot_token/);
  });

  it('persists the token in the local config so update/reconfigure reuse it', () => {
    expect(src).toMatch(/telegram_bot_token\?: string/);
  });
});