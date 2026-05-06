/**
 * Default backend URLs offered in the dev server picker. Users can also
 * type their own URL. The selection is persisted in `expo-secure-store`.
 *
 * Production builds ignore this list and use `bakedBackendUrl` instead.
 */

export interface IDevServer {
    label: string;
    url: string;
}

export const DEFAULT_DEV_SERVERS: readonly IDevServer[] = [
    { label: 'Local Symfony (Android emulator)', url: 'http://10.0.2.2:8000' },
    { label: 'Local Symfony (iOS simulator / web)', url: 'http://127.0.0.1:8000' },
    { label: 'Local Symfony Apache alias', url: 'http://127.0.0.1/symfony' },
    { label: 'Local Symfony LAN', url: 'http://192.168.1.10:8000' },
];
