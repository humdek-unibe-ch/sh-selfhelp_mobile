/**
 * Dev server selection catalog.
 *
 * Mirrors the legacy Capacitor app:
 *   POST appConfig.server
 *   body: mobile=true&device_id=WEB
 *   response: content[0].items[] with { text, value }
 */

import axios from 'axios';
import { CLIENT_TYPE_MOBILE, ENDPOINTS, HEADER_CLIENT_TYPE } from '@selfhelp/shared';

export interface IServerSelectionOption {
    label: string;
    url: string;
}

interface ILegacyServerItem {
    text?: unknown;
    value?: unknown;
}

interface ILegacyServerSelectionResponse {
    content?: {
        items?: ILegacyServerItem[];
    }[];
}

export function normalizeServerUrlInput(input: string): string {
    const trimmed = input.trim();
    if (!trimmed) return '';

    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withScheme);

    const cmsApiIndex = parsed.pathname.indexOf('/cms-api/v1');
    if (cmsApiIndex >= 0) {
        parsed.pathname = parsed.pathname.slice(0, cmsApiIndex) || '/';
        parsed.search = '';
        parsed.hash = '';
    }

    return parsed.toString().replace(/\/+$/, '');
}

export function canonicalizeLoopbackHost(url: string, preferredHost: 'localhost' | '127.0.0.1' = 'localhost'): string {
    const parsed = new URL(url);
    const normalizedHost = parsed.hostname.toLowerCase();
    if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(normalizedHost)) {
        return parsed.toString().replace(/\/+$/, '');
    }

    parsed.hostname = preferredHost;

    return parsed.toString().replace(/\/+$/, '');
}

export function looksLikeWebFrontendUrl(url: string): boolean {
    try {
        const parsed = new URL(normalizeServerUrlInput(url));
        return parsed.port === '3000';
    } catch {
        return false;
    }
}

export async function fetchServerSelectionOptions(selectionUrl: string): Promise<IServerSelectionOption[]> {
    const body = new URLSearchParams({
        mobile: 'true',
        device_id: 'WEB',
    }).toString();

    const response = await axios.post<ILegacyServerSelectionResponse | string>(selectionUrl, body, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const payload =
        typeof response.data === 'string'
            ? (JSON.parse(response.data) as ILegacyServerSelectionResponse)
            : response.data;

    const items = payload.content?.[0]?.items ?? [];
    return items
        .map((item) => ({
            label: typeof item.text === 'string' && item.text.trim() ? item.text.trim() : String(item.value ?? ''),
            url: typeof item.value === 'string' ? normalizeServerUrlInput(item.value) : '',
        }))
        .filter((item) => item.label && item.url);
}

export async function checkSelectedServer(baseURL: string): Promise<{ ok: true; baseURL: string }> {
    await axios.get(`${baseURL}${ENDPOINTS.LANGUAGES}`, {
        headers: {
            Accept: 'application/json',
            [HEADER_CLIENT_TYPE]: CLIENT_TYPE_MOBILE,
        },
        timeout: 7_000,
    });
    // Return a non-undefined value so TanStack Query v5 accepts it
    // (`useQuery` rejects `undefined` because it cannot tell "not loaded
    // yet" from "loaded a void value" otherwise).
    return { ok: true, baseURL };
}
