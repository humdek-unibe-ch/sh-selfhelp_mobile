/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Deep-link handling for the mobile app.
 *
 * Supported schemes:
 *   - Custom scheme: `selfhelp://<keyword>` (configurable via APP_SCHEME)
 *   - Universal links / app links: `https://<APP_UNIVERSAL_LINK_DOMAIN>/<keyword>`
 *
 * Both are normalised to a SelfHelp page-keyword and routed via
 * Expo Router. Auth tokens (from validate / reset-password emails)
 * are extracted from the path.
 */

import * as Linking from 'expo-linking';
import { router } from 'expo-router';

interface IParsedLink {
    keyword?: string;
    userId?: number;
    token?: string;
    raw: string;
}

function parseLink(url: string): IParsedLink {
    const parsed = Linking.parse(url);
    const path = (parsed.path ?? '').replace(/^\/+/, '');
    const segments = path.split('/').filter(Boolean);

    if (segments[0] === 'validate' && segments.length >= 3) {
        return { keyword: 'validate', userId: Number(segments[1]), token: segments[2], raw: url };
    }
    if (segments[0] === 'reset-password' && segments.length >= 3) {
        return { keyword: 'resetPassword', userId: Number(segments[1]), token: segments[2], raw: url };
    }
    return { keyword: segments[0], raw: url };
}

function routeFromLink(link: IParsedLink): void {
    if (!link.keyword) return;
    if (link.userId && link.token) {
        router.push({
            pathname: `/${link.keyword}`,
            params: { user_id: String(link.userId), token: link.token },
        });
        return;
    }
    router.push(`/${link.keyword}`);
}

export async function consumeInitialLink(): Promise<void> {
    const initial = await Linking.getInitialURL();
    if (initial) routeFromLink(parseLink(initial));
}

export function subscribeToLinks(): () => void {
    const sub = Linking.addEventListener('url', ({ url }) => {
        routeFromLink(parseLink(url));
    });
    return () => sub.remove();
}
