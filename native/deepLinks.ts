/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Deep-link handling for the mobile app.
 *
 * Supported schemes:
 *   - Custom scheme: `selfhelp://<path>` (configurable via APP_SCHEME)
 *   - Universal links / app links: `https://<APP_UNIVERSAL_LINK_DOMAIN>/<path>`
 *
 * The incoming URL is parsed to a path and classified by the pure
 * `classifyDeepLink()` helper (see `deepLinkRouting.ts`). Auth flows and simple
 * single-keyword links route locally (offline, no network). Anything
 * parameterized or nested (`/team/{record_id}`, `/help/getting-started`) is
 * resolved against the DB-driven `page_routes` contract via
 * `pageService.resolvePageByPath()` so the right page keyword + snake_case
 * `route_params` are used instead of hardcoded slug parsing (issue #30).
 */

import * as Linking from 'expo-linking';
import { router } from 'expo-router';

import { resolvePageByPath } from '../services/pageService';
import { classifyDeepLink } from './deepLinkRouting';
import { pageUrlToMobileRoute } from '@selfhelp/shared';

async function routeFromUrl(url: string): Promise<void> {
    const parsed = Linking.parse(url);
    const plan = classifyDeepLink(parsed.path);

    switch (plan.kind) {
        case 'none':
            return;

        case 'auth':
            router.push({ pathname: `/${plan.keyword}`, params: plan.routeParams });
            return;

        case 'keyword':
            try {
                const page = await resolvePageByPath(`/${plan.keyword}`);
                const params: Record<string, string> = {};
                for (const [key, value] of Object.entries(page.route_params ?? {})) {
                    params[key] = String(value);
                }
                const mobileRoute = pageUrlToMobileRoute(page.canonical_url ?? page.url, page.keyword);
                router.push({ pathname: mobileRoute, params });
            } catch {
                router.push(`/${plan.keyword}`);
            }
            return;

        case 'resolve':
            try {
                const page = await resolvePageByPath(plan.path);
                const params: Record<string, string> = {};
                for (const [key, value] of Object.entries(page.route_params ?? {})) {
                    params[key] = String(value);
                }
                const mobileRoute = pageUrlToMobileRoute(page.canonical_url ?? page.url, page.keyword);
                router.push({ pathname: mobileRoute, params });
            } catch {
                // Path could not be resolved (offline, removed route, …). Fall
                // back to the first segment as a keyword so the link still lands
                // somewhere sane rather than dropping silently.
                const first = plan.path.replace(/^\/+/, '').split('/')[0];
                if (first) router.push(`/${first}`);
            }
            return;
    }
}

export async function consumeInitialLink(): Promise<void> {
    const initial = await Linking.getInitialURL();
    if (initial) await routeFromUrl(initial);
}

export function subscribeToLinks(): () => void {
    const sub = Linking.addEventListener('url', ({ url }) => {
        void routeFromUrl(url);
    });
    return () => sub.remove();
}
