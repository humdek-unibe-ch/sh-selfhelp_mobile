/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Dev-only suppression of benign `react-native-web` warnings.
 *
 * Now that HeroUI Native + RN primitives render on web (see
 * `providers/ThemeProvider.tsx`), they forward a handful of React
 * Native-only props (e.g. `importantForAccessibility`) straight to DOM
 * elements. `react-native-web` logs a `console.error` for each, which the
 * Expo LogBox overlay then stacks on top of the UI — physically covering
 * the header/menu. These are harmless, dev-only, and never appear in
 * native or production builds.
 *
 * Everything here is gated behind `__DEV__`:
 *   1. `LogBox.ignoreLogs(...)` hides matching entries from the overlay on
 *      every platform.
 *   2. On web only, we additionally filter `console.error` / `console.warn`
 *      for the same known-benign messages so they never reach LogBox (which
 *      mirrors console output) nor clutter the browser console. Any log that
 *      does not match a pattern passes through untouched.
 */

import { LogBox, Platform } from 'react-native';

const BENIGN_PATTERNS: readonly RegExp[] = [
    /React does not recognize the .* prop on a DOM element/i,
    /Unknown event handler property/i,
    /Received `?(?:true|false)`? for a non-boolean attribute/i,
    /props\.pointerEvents is deprecated\. Use style\.pointerEvents/i,
    /Invalid DOM property/i,
];

function isBenign(args: readonly unknown[]): boolean {
    const first = args[0];
    if (typeof first !== 'string') return false;
    return BENIGN_PATTERNS.some((re) => re.test(first));
}

let installed = false;

export function installDevWarningFilter(): void {
    if (!__DEV__ || installed) return;
    installed = true;

    LogBox.ignoreLogs([...BENIGN_PATTERNS]);

    // The LogBox overlay only exists on web in addition to native; the
    // noisy entries originate from `console.error`, so on web we filter at
    // the source to guarantee they never surface.
    if (Platform.OS !== 'web') return;

    const originalError = console.error.bind(console);
    const originalWarn = console.warn.bind(console);

    console.error = (...args: unknown[]): void => {
        if (isBenign(args)) return;
        originalError(...args);
    };
    console.warn = (...args: unknown[]): void => {
        if (isBenign(args)) return;
        originalWarn(...args);
    };
}
