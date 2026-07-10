/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Pure column-selection logic for the mobile `entry-table` style.
 *
 * `fields_map` is an ordered JSON array of `field_key` values; per-locale header
 * overrides live in `fields_map_labels` (`field_key => label`). Legacy
 * `{field_name, field_new_name}` objects are still parsed for older content.
 */

import { parseFieldsMapCatalog, parseFieldsMapLabels } from '@selfhelp/shared';

export interface IFieldMapping {
    field_name: string;
    field_new_name: string;
}

export interface IEntryTableColumn {
    key: string;
    label: string;
}

const INTERNAL_KEYS = new Set(['record_id', 'id_users', '_can_delete', '_can_edit', 'entry_date']);

function parseLegacyLabelOverrides(raw: string | undefined): Record<string, string> {
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return {};
        const labels: Record<string, string> = {};
        for (const item of parsed) {
            if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
            const record = item as Record<string, unknown>;
            const fieldName = typeof record.field_name === 'string' ? record.field_name.trim() : '';
            const fieldLabel = typeof record.field_new_name === 'string' ? record.field_new_name.trim() : '';
            if (fieldName && fieldLabel) {
                labels[fieldName] = fieldLabel;
            }
        }
        return labels;
    } catch {
        return {};
    }
}

/** @deprecated Use parseFieldsMapCatalog — kept for tests importing the legacy name. */
export function parseFieldMappings(raw: string | undefined): IFieldMapping[] {
    return parseFieldsMapCatalog(raw).map((field_name) => ({ field_name, field_new_name: '' }));
}

export function buildEntryTableColumns(
    rawFieldsMap: string | undefined,
    sampleEntry: Record<string, unknown> | undefined,
    showTimestamp: boolean,
    fieldLabels: Record<string, string> = {},
    rawFieldsMapLabels?: string,
): IEntryTableColumn[] {
    const fieldKeys = parseFieldsMapCatalog(rawFieldsMap);
    const fieldsMapLabels = {
        ...parseLegacyLabelOverrides(rawFieldsMap),
        ...parseFieldsMapLabels(rawFieldsMapLabels),
    };
    const dataKeys = Object.keys(sampleEntry ?? {}).filter((key) => !INTERNAL_KEYS.has(key));

    const mapped: IEntryTableColumn[] = fieldKeys.length > 0
        ? fieldKeys
            .map((fieldKey): IEntryTableColumn | null => {
                const key = dataKeys.includes(fieldKey)
                    ? fieldKey
                    : dataKeys.find((candidate) => fieldLabels[candidate] === fieldKey);
                if (key === undefined) return null;
                const label = fieldsMapLabels[key]
                    || fieldsMapLabels[fieldKey]
                    || fieldLabels[key]
                    || key;
                return { key, label };
            })
            .filter((column): column is IEntryTableColumn => column !== null)
        : dataKeys.map((key) => ({
            key,
            label: fieldsMapLabels[key] || fieldLabels[key] || key,
        }));

    return showTimestamp ? [{ key: 'entry_date', label: 'Date' }, ...mapped] : mapped;
}
