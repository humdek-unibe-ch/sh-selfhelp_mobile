/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Mobile plugin version drift detector.
 *
 * The mobile app bundles plugin npm packages at EAS build time via
 * `scripts/plugins-sync.mjs`, which writes `registeredPluginVersions`
 * into `components/styles/registered.ts`. The host CMS can install a
 * newer plugin release at any time *after* the EAS build was cut —
 * when that happens, the mobile app would silently render the old
 * code while the backend speaks the new schema.
 *
 * This hook:
 *   1. Fetches the live plugin manifest from
 *      `/cms-api/v1/plugins/manifest` through the shared `apiClient`.
 *      React Query is configured with `staleTime: Infinity` so we do
 *      NOT poll — Mercure pushes invalidations later (Phase 3).
 *   2. Diffs each entry against `registeredPluginVersions`.
 *   3. Returns the list of mismatches so `PluginVersionMismatchBanner`
 *      can show them with actionable copy.
 *
 * The hook is safe to call when no server is selected (it returns an
 * empty array) and tolerates manifest fetch errors quietly — we don't
 * want a transient network blip to nag the user with a red banner.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { getApiClient } from '@/services/apiClient';
import { registeredPluginVersions } from '@/components/styles/registered';
import { useServerStore } from '@/stores/serverStore';

interface IPluginManifestEntry {
    id?: string;
    pluginId?: string;
    name?: string;
    version: string;
    enabled: boolean;
}

interface IPluginManifestResponse {
    plugins: IPluginManifestEntry[];
}

export type TPluginMobileWarningKind =
    | 'hostNewerThanApp'
    | 'appNewerThanHost'
    | 'pluginNotBundled';

export interface IPluginMobileVersionWarning {
    pluginId: string;
    pluginName?: string;
    kind: TPluginMobileWarningKind;
    appVersion?: string;
    hostVersion: string;
    message: string;
}

async function fetchManifest(): Promise<IPluginManifestResponse> {
    const client = getApiClient();
    const res = await client.get<{ data?: IPluginManifestResponse }>('/cms-api/v1/plugins/manifest');
    return res.data?.data ?? { plugins: [] };
}

function buildWarnings(manifest: IPluginManifestResponse): IPluginMobileVersionWarning[] {
    const warnings: IPluginMobileVersionWarning[] = [];
    for (const entry of manifest.plugins ?? []) {
        if (!entry.enabled) continue;
        const pluginId = entry.pluginId ?? entry.id;
        if (!pluginId) continue;
        const hostVersion = entry.version;
        const appVersion = registeredPluginVersions[pluginId];
        if (!appVersion) {
            // Plugin is enabled on the host but the app binary does
            // not ship the corresponding mobile package. That's only
            // a problem if the plugin is supposed to be usable on
            // mobile — `OpenOnWebFallback` already handles styles
            // gracefully, but operators may still want to know.
            continue;
        }
        if (appVersion === hostVersion) continue;
        const isAppOlder = compareSemver(appVersion, hostVersion) < 0;
        warnings.push({
            pluginId,
            pluginName: entry.name,
            kind: isAppOlder ? 'hostNewerThanApp' : 'appNewerThanHost',
            appVersion,
            hostVersion,
            message: isAppOlder
                ? `The host runs ${entry.name ?? pluginId} v${hostVersion}, but this app build ships v${appVersion}. Ship a new EAS build (or roll the host back) before relying on the plugin on mobile.`
                : `This app build ships ${entry.name ?? pluginId} v${appVersion}, newer than the host (v${hostVersion}). Update the host plugin (the mobile build is ahead of the backend).`,
        });
    }
    return warnings;
}

function compareSemver(a: string, b: string): number {
    const [amaj, amin = '0', apatch = '0'] = a.split('.');
    const [bmaj, bmin = '0', bpatch = '0'] = b.split('.');
    if (Number(amaj) !== Number(bmaj)) return Number(amaj) - Number(bmaj);
    if (Number(amin) !== Number(bmin)) return Number(amin) - Number(bmin);
    return Number(apatch) - Number(bpatch);
}

export function usePluginVersionWarnings(): IPluginMobileVersionWarning[] {
    const serverUrl = useServerStore((s) => s.serverUrl);
    const { data } = useQuery({
        queryKey: ['plugins-manifest', serverUrl],
        queryFn: fetchManifest,
        enabled: Boolean(serverUrl),
        staleTime: Infinity,
        gcTime: 1000 * 60 * 30,
        retry: false,
    });
    return useMemo(() => (data ? buildWarnings(data) : []), [data]);
}
