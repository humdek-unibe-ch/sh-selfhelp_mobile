import type { ExpoConfig } from 'expo/config';

/**
 * Per-build instance configuration.
 *
 * The mobile app supports two distinct build modes (see docs/builds.md):
 *
 *   1. **Dev / preview builds** — multi-tenant. The user can switch
 *      backend at runtime via the dev server picker (saved in
 *      `expo-secure-store`). `instanceSlug` is `'dev'`.
 *
 *   2. **Production builds** — single-tenant. The instance slug + baked
 *      backend URL are passed via env vars at build time so each
 *      customer gets a uniquely identified app.
 *
 * Env vars consumed (set in EAS Build profile or `.env.local` for web):
 *   - APP_INSTANCE_SLUG  — e.g. `tpf`, `mp`, `dev` (default: `dev`)
 *   - APP_BACKEND_URL    — e.g. `https://api.tpf.example.com`
 *   - APP_SERVER_SELECTION_URL — dev picker catalog endpoint, same role as
 *      the old Capacitor app's `appConfig.server`.
 *   - APP_NAME_OVERRIDE  — optional human name shown on the home screen
 *   - APP_BUNDLE_ID      — iOS bundle id (per instance)
 *   - APP_PACKAGE_NAME   — Android package name (per instance)
 *   - APP_SCHEME         — deep-link scheme (default `selfhelp`)
 */

const slug = process.env.APP_INSTANCE_SLUG ?? 'dev';
const isDevInstance = slug === 'dev';

const config: ExpoConfig = {
    name: process.env.APP_NAME_OVERRIDE ?? (isDevInstance ? 'SelfHelp Dev' : 'SelfHelp'),
    slug: `selfhelp-${slug}`,
    version: '0.1.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    scheme: process.env.APP_SCHEME ?? 'selfhelp',
    userInterfaceStyle: 'automatic',
    splash: {
        image: './assets/splash.png',
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
        supportsTablet: true,
        bundleIdentifier:
            process.env.APP_BUNDLE_ID ?? (isDevInstance ? 'com.selfhelp.dev' : `com.selfhelp.${slug}`),
        infoPlist: {
            ITSAppUsesNonExemptEncryption: false,
            NSCameraUsageDescription:
                'SelfHelp uses your camera so you can attach photos and videos to forms and entries.',
            NSMicrophoneUsageDescription:
                'SelfHelp uses your microphone so you can attach audio to forms and entries.',
            NSPhotoLibraryUsageDescription:
                'SelfHelp can read photos from your library when you attach them to forms.',
            NSPhotoLibraryAddUsageDescription:
                'SelfHelp saves photos to your library when you download an attachment.',
        },
        associatedDomains: process.env.APP_UNIVERSAL_LINK_DOMAIN
            ? [`applinks:${process.env.APP_UNIVERSAL_LINK_DOMAIN}`]
            : [],
    },
    android: {
        package:
            process.env.APP_PACKAGE_NAME ?? (isDevInstance ? 'com.selfhelp.dev' : `com.selfhelp.${slug}`),
        adaptiveIcon: {
            foregroundImage: './assets/adaptive-icon.png',
            backgroundColor: '#ffffff',
        },
        permissions: [
            'CAMERA',
            'RECORD_AUDIO',
            'READ_MEDIA_IMAGES',
            'READ_MEDIA_VIDEO',
            'READ_MEDIA_AUDIO',
            'POST_NOTIFICATIONS',
        ],
        intentFilters: process.env.APP_UNIVERSAL_LINK_DOMAIN
            ? [
                  {
                      action: 'VIEW',
                      autoVerify: true,
                      data: [
                          {
                              scheme: 'https',
                              host: process.env.APP_UNIVERSAL_LINK_DOMAIN,
                          },
                      ],
                      category: ['BROWSABLE', 'DEFAULT'],
                  },
              ]
            : [],
    },
    web: {
        favicon: './assets/favicon.png',
        bundler: 'metro',
    },
    plugins: [
        'expo-router',
        'expo-secure-store',
        'expo-localization',
        'expo-camera',
        ['expo-image-picker', { photosPermission: 'SelfHelp accesses your photos to attach to forms.' }],
        'expo-video',
        'expo-audio',
        [
            'expo-notifications',
            {
                icon: './assets/notification-icon.png',
                color: '#228be6',
            },
        ],
        'expo-asset',
        'expo-splash-screen',
    ],
    experiments: {
        typedRoutes: true,
    },
    runtimeVersion: { policy: 'appVersion' },
    updates: {
        enabled: true,
        url: process.env.APP_EAS_UPDATE_URL,
    },
    extra: {
        instanceSlug: slug,
        bakedBackendUrl: process.env.APP_BACKEND_URL ?? null,
        serverSelectionUrl:
            process.env.APP_SERVER_SELECTION_URL ??
            'https://tpf-test.humdek.unibe.ch/SelfHelpMobile/mobile_projects',
        isDevInstance,
        eas: { projectId: process.env.APP_EAS_PROJECT_ID },
    },
};

export default config;
