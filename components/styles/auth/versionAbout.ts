/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * What the `version` style ("about the platform") draws on the device.
 *
 * Pure on purpose: no React Native import, so `node --test` can check exactly
 * what is shown (`__tests__/versionStyle.test.mjs`). `Version.tsx` only turns
 * this model into native views.
 *
 * The backend fills `section.about` after the page cache is read, so
 * `about.detail` is true only for a caller who may see exact versions. The app
 * never decides that: with `detail` false every version is dropped here, also
 * from the app's own list, whose items carry versions.
 *
 * Headings and the filter labels are translatable style fields, so no text is
 * typed in the app. An empty heading field means a group without a heading, not
 * a fallback. Filtering is a case-insensitive substring on name and licence.
 */
import type { IAboutItem } from '@selfhelp/shared';
import type { TSectionLike } from '@/components/renderer/types';
import { readStringField } from '@/components/renderer/useField';
import { stripHtmlToText } from '@/components/renderer/sanitizeContent';

export type TVersionAboutGroupKey = 'frameworks' | 'plugins' | 'libraries' | 'app';

export interface IVersionAboutGroup {
    key: TVersionAboutGroupKey;
    /** Plain text from the group's heading field; empty when the field is empty. */
    heading: string;
    items: IAboutItem[];
}

export interface IVersionAboutModel {
    /** Plain text from the `title` field; empty when the field is empty. */
    title: string;
    /** `"<product name> <product version>"`, always shown. */
    product: string;
    /** Placeholder / accessible label of the filter; empty when the field is empty. */
    filterLabel: string;
    /** Shown when the filter matches no row of the active group; empty when the field is empty. */
    noMatchLabel: string;
    /** Server groups first, in contract order, then the app's own group. Empty lists are left out. */
    groups: IVersionAboutGroup[];
}

const SERVER_GROUPS = [
    { key: 'frameworks', field: 'label_frameworks' },
    { key: 'plugins', field: 'label_plugins' },
    { key: 'libraries', field: 'label_libraries' },
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function textOrNull(value: unknown): string | null {
    return typeof value === 'string' && value !== '' ? value : null;
}

/** Keeps well-formed items only, so a malformed entry can never draw "undefined" or "null". */
function toItems(value: unknown): IAboutItem[] {
    if (!Array.isArray(value)) {
        return [];
    }
    const items: IAboutItem[] = [];
    for (const entry of value) {
        if (!isRecord(entry)) {
            continue;
        }
        const name = textOrNull(entry.name);
        if (name === null) {
            continue;
        }
        items.push({ name, version: textOrNull(entry.version), license: textOrNull(entry.license) });
    }
    return items;
}

/** The versions a viewer may see: all of them with `detail`, none without. */
function visibleItems(items: IAboutItem[], showVersions: boolean): IAboutItem[] {
    return items.map((item) => ({ ...item, version: showVersions ? item.version : null }));
}

/** Case-insensitive substring match on name and licence. */
export function filterAboutItems(items: readonly IAboutItem[], query: string): IAboutItem[] {
    const needle = query.trim().toLowerCase();
    if (!needle) {
        return [...items];
    }
    return items.filter((item) => {
        const name = item.name.toLowerCase();
        const license = (item.license ?? '').toLowerCase();
        return name.includes(needle) || license.includes(needle);
    });
}

/**
 * @param section The `version` section as the page renderer hands it over.
 * @param appLibraries The app's own list, generated from `package.json` (`config/appLibraries.generated.json`).
 * @returns `null` when the section carries no usable `about` (an older backend), so nothing is drawn.
 */
export function buildVersionAbout(section: TSectionLike, appLibraries: readonly IAboutItem[]): IVersionAboutModel | null {
    const about = (section as unknown as Record<string, unknown>).about;
    if (!isRecord(about) || !isRecord(about.product)) {
        return null;
    }
    const productName = textOrNull(about.product.name);
    const productVersion = textOrNull(about.product.version);
    if (productName === null || productVersion === null) {
        return null;
    }

    const showVersions = about.detail === true;
    const heading = (field: string): string => stripHtmlToText(readStringField(section, field)).trim();

    const groups: IVersionAboutGroup[] = [];
    for (const { key, field } of SERVER_GROUPS) {
        const items = visibleItems(toItems(about[key]), showVersions);
        if (items.length > 0) {
            groups.push({ key, heading: heading(field), items });
        }
    }

    const appItems = visibleItems(toItems(appLibraries), showVersions);
    if (appItems.length > 0) {
        groups.push({ key: 'app', heading: heading('label_app'), items: appItems });
    }

    return {
        title: heading('title'),
        product: `${productName} ${productVersion}`,
        filterLabel: heading('label_filter'),
        noMatchLabel: heading('label_no_match'),
        groups,
    };
}
