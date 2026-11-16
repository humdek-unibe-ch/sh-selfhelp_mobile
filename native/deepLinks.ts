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
 * resolved through `navigateToResolvedPath` → `GET /pages/resolve` so
 * `route_params` hydrate entry-record / entry-record-form pages (issue #30).
 * Parameterized resolve failures never keyword-fallback (that drops hydration).
 *
 * The query of a link travels with it (`selfhelp://events?events.page=2&events.q=ana`):
 * a page that keeps its state in the link, like an entry list, opens in that state.
 */

import * as Linking from 'expo-linking';
import { router } from 'expo-router';

import { stringParams } from '@/components/shell/navigationUtils';
import {
    navigateToPage,
    navigateToResolvedPath,
} from '@/components/shell/usePageNavigation';
import { classifyDeepLink } from './deepLinkRouting';

async function routeFromUrl(url: string): Promise<void> {
    const parsed = Linking.parse(url);
    const plan = classifyDeepLink(parsed.path);
    // The link's query is part of where it leads: an entry list opens on its page, search, filters or record.
    const query = stringParams(parsed.queryParams);

    switch (plan.kind) {
        case 'none':
            return;

        case 'auth':
            router.push({ pathname: `/${plan.keyword}`, params: plan.routeParams });
            return;

        case 'keyword':
            navigateToPage(`/${plan.keyword}`, query);
            return;

        case 'resolve':
            // Path-first only — never keyword-fallback a multi-segment URL.
            await navigateToResolvedPath(plan.path, query);
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
