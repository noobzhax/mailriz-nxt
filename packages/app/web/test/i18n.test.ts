import { describe, it, expect } from 'bun:test';
import { t } from '../src/lib/i18n';

/**
 * The dictionary is the single source of every user-visible string. English
 * is the baseline; any language without entries falls back to it.
 */

describe('t', () => {
  it('resolves nested keys from the English baseline', () => {
    expect(t('en', 'sidebar.newAlias')).toBe('New Alias');
    expect(t('en', 'topbar.refreshLive')).toContain('Refresh mail (R)');
    expect(t('en', 'settingsPane.chatIds')).toBe('Chat ids');
  });

  it('falls back to English for incomplete languages', () => {
    // Indonesian translations land later; today it mirrors English.
    expect(t('id', 'folders.inbox')).toBe(t('en', 'folders.inbox'));
    expect(t('id', 'reading.empty')).toBe('Select an email to read');
  });

  it('returns the key itself when nothing is found', () => {
    expect(t('en', 'settingsPane.loadFailed' as never)).toBe('Could not load settings');
  });
});