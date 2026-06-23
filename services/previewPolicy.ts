/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Whether a page fetch should actually request the unpublished draft
 * (`?preview=true`).
 *
 * The backend only serves drafts to an authenticated caller — an anonymous
 * `preview=true` request is rejected with `401`
 * (see `PageService::resolvePageResponse` in the Symfony backend, core
 * >= 0.1.18). The dev-only preview toggle (`useDevModeStore.previewMode`)
 * must therefore be ignored until the user has a token; otherwise the public
 * home/login screens fire `home?preview=true` / `login?preview=true`, get a
 * `401` on every launch, and the app can neither load the page nor reach the
 * login screen.
 *
 * Kept as a standalone pure function (no React / store imports) so it stays
 * unit-testable under `node --test`.
 */
export function resolvePreviewRequest(previewMode: boolean, isAuthenticated: boolean): boolean {
    return previewMode && isAuthenticated;
}
