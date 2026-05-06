/**
 * Dev server selection catalog.
 *
 * Mirrors the legacy Capacitor app:
 *   POST appConfig.server
 *   body: mobile=true&device_id=WEB
 *   response: content[0].items[] with { text, value }
 */

import axios from 'axios';

export interface IServerSelectionOption {
    label: string;
    url: string;
}

interface ILegacyServerItem {
    text?: unknown;
    value?: unknown;
}

interface ILegacyServerSelectionResponse {
    content?: Array<{
        items?: ILegacyServerItem[];
    }>;
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
