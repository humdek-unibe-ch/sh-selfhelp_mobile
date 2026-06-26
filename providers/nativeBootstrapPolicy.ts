/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * NativeBootstrap installs side effects that are meaningful only on native
 * runtimes. Expo Router already owns browser URL state on web; replaying the
 * iframe URL through the native deep-link handler can turn `/mobile-preview/`
 * into a fake CMS keyword and trigger a history push loop.
 */

export function shouldRunNativeStartupSideEffects(platformOS: string): boolean {
    return platformOS !== 'web';
}
