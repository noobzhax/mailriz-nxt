import { useMemo } from 'react';
import type { Language } from '@mailriz/shared';

/**
 * Minimal dictionary — no i18n dependency, just a typed map and a hook.
 *
 * English is the baseline and the only complete translation today; the `id`
 * entries fall back to English until the Indonesian translation lands. Every
 * user-visible string in the dashboard lives here so a future language is a
 * matter of filling in the map, not hunting through components.
 */
const EN = {
  app: {
    name: 'MailRiz',
    tagline: 'Private Inbox',
  },
  sidebar: {
    newAlias: 'New Alias',
    allMail: 'All mail',
    labels: 'Labels',
    aliases: 'Aliases',
    settings: 'Settings',
    off: 'off',
    auto: 'auto',
    autoTitle: 'Created automatically when mail first arrived',
    signOut: 'Sign out',
    closeMenu: 'Close menu',
    mute: 'Mute Telegram notifications',
    unmute: 'Unmute Telegram notifications',
  },
  topbar: {
    refreshLive: 'Refresh mail (R) · new mail arrives on its own',
    refreshDisconnected: 'Refresh mail (R) · live updates disconnected',
    refreshing: 'Refreshing.',
    refresh: 'Refresh mail',
    themeLight: 'Switch to light theme',
    themeDark: 'Switch to dark theme',
    search: 'Search mail',
    searchPlaceholder: 'Search mail…',
    openMenu: 'Open menu',
    hideSidebar: 'Hide sidebar',
    showSidebar: 'Show sidebar',
    mail: 'Mail',
  },
  folders: {
    inbox: 'Inbox',
    starred: 'Starred',
    archived: 'Archived',
    trash: 'Trash',
  },
  list: {
    noEmails: 'No emails',
    loading: 'Loading…',
  },
  reading: {
    back: 'Back to list',
    noSubject: '(no subject)',
    star: 'Star this message',
    unstar: 'Remove star',
    archive: 'Archive — keep it, out of the inbox',
    unarchive: 'Move back to inbox',
    trash: 'Move to trash — purged after 30 days',
    restore: 'Restore from trash',
    markRead: 'Mark as read',
    markUnread: 'Mark as unread',
    downloadRaw: 'Download original .eml',
    showImages: 'Show images',
    blockedOne: '1 external image is blocked for your privacy.',
    blockedMany: '{n} external images are blocked for your privacy.',
    noContent: 'No content.',
    emailBodyTitle: 'Email body',
    empty: 'Select an email to read',
  },
  settingsPane: {
    title: 'Settings',
    subtitle: 'Telegram notifications',
    back: 'Back to inbox',
    noToken:
      'No bot token deployed. Create a bot with @BotFather, then run mailriz-cli reconfigure and paste the token there.',
    enabled: 'Receive new-mail notifications',
    enabledDesc: 'A Telegram message for every incoming email, with a button to open it here.',
    chatIds: 'Chat ids',
    chatIdsDesc:
      'Chats the bot writes to, comma-separated. Message the bot once from each chat (e.g. /start), then find the ids with @userinfobot.',
    chatIdsPlaceholder: '123456789, -1001234567890',
    save: 'Save',
    saved: 'Saved',
    fullBody: 'Include full message body',
    fullBodyDesc: 'Appends the plain-text body to each notification (capped at 4096 chars).',
    botCommands: 'Bot commands',
    botCommandsDesc:
      'Registers the webhook so /refresh works: send it to the bot and this dashboard refetches immediately.',
    register: 'Register webhook',
    reRegister: 'Re-register webhook',
    registering: 'Registering…',
    active: 'active',
    webhookHintActive: 'Webhook active — /refresh is ready to use.',
    webhookHintMissing: 'Not registered yet.',
    webhookHintNoToken: 'Needs a bot token deployed.',
    test: 'Send test message',
    sending: 'Sending…',
    testDesc: 'Delivers to every chat id above.',
    testDescMissing: 'Needs a bot token and at least one chat id.',
    testSent: 'Test message sent — check Telegram',
    webhookRegistered: 'Webhook registered — try sending /refresh to the bot in Telegram',
    loadFailed: 'Could not load settings',
    language: 'Language',
    languageDesc: 'UI language for the dashboard and Telegram messages.',
    languageEn: 'English',
    languageId: 'Bahasa Indonesia',
    languageIdSoon: 'Bahasa Indonesia — the translation lands soon; English is shown for now.',
  },
  newAlias: {
    title: 'New Alias',
    modeRandom: 'random',
    modeCustom: 'custom',
    localPart: 'Local part',
    localPartHint: '[a-z0-9._-], max 64 chars',
    localPartPlaceholder: 'newsletter',
    prefix: 'Prefix (optional)',
    prefixPlaceholder: 'news',
    randomNote: 'Random =',
    label: 'Label',
    labelPlaceholder: 'Newsletters',
    note: 'Note',
    notePlaceholder: 'Where this is used',
    create: 'Create Alias',
    creating: 'Creating…',
    copied: 'Copied to clipboard',
  },
  auth: {
    signIn: 'Sign in',
    signingIn: 'Signing in…',
    email: 'Email',
    emailPlaceholder: 'you@example.com',
    password: 'Password',
  },
} as const;

type Key = {
  [K in keyof typeof EN]: (typeof EN)[K] extends string ? K : `${K}.${Extract<keyof (typeof EN)[K], string>}`;
}[keyof typeof EN];

const dict: Record<Language, Record<string, string>> = {
  en: flatten(EN),
  // Indonesian translations land later; fall back to English meanwhile.
  id: flatten(EN),
};

function flatten(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out[key] = v;
    else Object.assign(out, flatten(v as Record<string, unknown>, key));
  }
  return out;
}

export function t(lang: Language, key: Key): string {
  return dict[lang]?.[key] ?? dict.en[key] ?? key;
}

/** Current UI language, resolved from the server-provided preference. */
export function useI18n(language?: Language) {
  return useMemo(() => {
    const lang: Language = language === 'id' ? 'id' : 'en';
    return {
      lang,
      t: (key: Key) => t(lang, key),
    };
  }, [language]);
}

export type { Key as I18nKey };