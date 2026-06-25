/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Earliest web boot side-effect: strip preview embed params from the URL BEFORE
 * expo-router boots.
 *
 * On web, `expo-router/entry` renders synchronously while it evaluates, and its
 * linking layer reads `window.location` immediately. Left in the address bar,
 * the preview embed query (`previewSession`, `keyword`, `previewShell`, ...)
 * destabilises expo-router's web state<->URL round-trip: the linking effect can
 * re-push the root route on every commit, Chromium throttles the
 * `history.pushState` flood ("Throttling navigation to prevent the browser from
 * hanging"), and the embedded Live Preview pane hangs on "Starting up…".
 *
 * This module is imported AHEAD of `expo-router/entry` from the custom `index.js`
 * entry; ES module evaluation order guarantees the capture runs first. The full
 * embed query is preserved in `sessionStorage` so the runtime still recovers the
 * one-time code for the token exchange (see `getWebPreviewRuntime`). No-op on
 * native (no `window`).
 */

import { capturePreviewSessionFromUrl } from '@/config/webPreviewSession';

capturePreviewSessionFromUrl();
