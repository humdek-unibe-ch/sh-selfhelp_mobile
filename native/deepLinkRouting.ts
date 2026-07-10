/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Pure deep-link classification for the mobile app (issue #30).
 *
 * Kept free of any `expo-*` imports so it can be unit-tested under the repo's
 * `node --test` runner. `deepLinks.ts` parses the incoming URL with
 * `expo-linking` and feeds the resulting path here; this module decides how the
 * link should be routed:
 *
 *   - `auth`    → intentional **pre-auth** local parsing for the two seeded
 *                 activation/reset flows that must work before a session (and
 *                 often offline): `/validate/{user_id}/{token}`,
 *                 `/reset/{user_id}/{token}`, and the `/reset-password/...`
 *                 alias. This is NOT a general page router — patterns are
 *                 deliberately narrow (exact first segment + ≥2 trailing
 *                 segments) so arbitrary CMS parameterized routes
 *                 (`/team/5`, …) never classify as auth. Captured values use
 *                 the snake_case names (`user_id`, `token`) that backend
 *                 `page_routes` and the auth screens share. Keep these
 *                 patterns in lockstep with backend seeded routes (parity
 *                 covered by mobile + backend tests).
 *   - `keyword` → a single static segment (`/login`, `/home`): route straight
 *                 to the Expo Router screen for that keyword (no network).
 *   - `resolve` → anything deeper / parameterized (`/team/5`,
 *                 `/help/getting-started`): resolve the full path against the
 *                 DB-driven `page_routes` contract so the correct page keyword
 *                 and `route_params` are used instead of hardcoded slug parsing.
 *   - `none`    → empty path, nothing to route.
 */

export type DeepLinkPlan =
    | { kind: 'none' }
    | { kind: 'auth'; keyword: 'validate' | 'reset-password'; routeParams: { user_id: string; token: string } }
    | { kind: 'keyword'; keyword: string }
    | { kind: 'resolve'; path: string };

/**
 * Classify an already-parsed deep-link path (the part after the scheme/host).
 * Leading slashes are tolerated; the function never throws.
 */
export function classifyDeepLink(rawPath: string | null | undefined): DeepLinkPlan {
    const segments = (rawPath ?? '').replace(/^\/+/, '').split('/').filter(Boolean);
    if (segments.length === 0) return { kind: 'none' };

    if (segments[0] === 'validate' && segments.length >= 3) {
        return { kind: 'auth', keyword: 'validate', routeParams: { user_id: segments[1], token: segments[2] } };
    }
    // Canonical reset link is `/reset/{user_id}/{token}`; `/reset-password/...`
    // is accepted as an alias. Both map to the kebab CMS keyword `reset-password`.
    if ((segments[0] === 'reset' || segments[0] === 'reset-password') && segments.length >= 3) {
        return { kind: 'auth', keyword: 'reset-password', routeParams: { user_id: segments[1], token: segments[2] } };
    }

    if (segments.length === 1) {
        return { kind: 'keyword', keyword: segments[0] };
    }

    return { kind: 'resolve', path: '/' + segments.join('/') };
}
