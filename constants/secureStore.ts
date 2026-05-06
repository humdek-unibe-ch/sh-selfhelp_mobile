/**
 * Keys used with `expo-secure-store`. Centralised so we don't rely on
 * stringly-typed access scattered across the app.
 */

export const SECURE_STORE_KEYS = {
    REFRESH_TOKEN: 'sh.refresh_token',
    SERVER_URL: 'sh.server_url',
    LANGUAGE_LOCALE: 'sh.language_locale',
    DEVICE_TOKEN: 'sh.device_token',
    DEV_MODE: 'sh.dev_mode',
} as const;

export type TSecureStoreKey = (typeof SECURE_STORE_KEYS)[keyof typeof SECURE_STORE_KEYS];
