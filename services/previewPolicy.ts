/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Whether a page fetch should actually request the unpublished draft
 * (`?preview=true`).
 *
 * The backend serves drafts only to a caller who may edit the page
 * (`admin.page.update` plus the update grant; admin passes). An anonymous
 * `preview=true` is `401`; a signed-in caller without edit rights gets `403`
 * and the client's error UI shows that server reason (no access decision here).
 * The CMS mobile live preview uses the admin's preview token, so it passes.
 * The native app's dev-only preview toggle (`useDevModeStore.previewMode`) is
 * still gated on a token here so public home/login screens never fire
 * `preview=true` and 401 on every launch; participants who flip the toggle
 * get the server's 403 rather than a client-side guess.
 *
 * Kept as a standalone pure function (no React / store imports) so it stays
 * unit-testable under `node --test`.
 */
export function resolvePreviewRequest(previewMode: boolean, isAuthenticated: boolean): boolean {
    return previewMode && isAuthenticated;
}
