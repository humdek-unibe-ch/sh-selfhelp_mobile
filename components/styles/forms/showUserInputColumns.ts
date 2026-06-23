/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Pure column-selection logic for the mobile `show-user-input` style, kept in a
 * react-native-free module so it can be unit-tested directly.
 *
 * Mirrors the web table contract: the author picks which fields render (and
 * their labels) through the `fields_map` JSON; with no mapping every data key is
 * shown. `show_timestamp` prepends a leading "Date" column. The internal
 * bookkeeping keys are never shown as data rows.
 */

/** A column definition authored in the `fields_map` JSON. */
export interface IFieldMapping {
    field_name: string;
    field_new_name: string;
}

export interface IShowUserInputColumn {
    key: string;
    label: string;
}

// Bookkeeping keys never shown as data rows. `entry_date` surfaces only as the
// leading "Date" column when `show_timestamp` is enabled (matching the web table).
const INTERNAL_KEYS = new Set(['record_id', 'id_users', '_can_delete', 'entry_date']);

/** Parse the author's `fields_map` column config; tolerate empty/invalid JSON. */
export function parseFieldMappings(raw: string | undefined): IFieldMapping[] {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((m): m is IFieldMapping => !!m && typeof (m as IFieldMapping).field_name === 'string')
            .map((m) => ({ field_name: m.field_name, field_new_name: m.field_new_name ?? '' }));
    } catch {
        return [];
    }
}

/**
 * Resolve the ordered columns to render for a show-user-input card list.
 *
 * @param rawFieldsMap  the section's `fields_map` JSON string (or undefined)
 * @param sampleEntry   any one entry, used to derive columns when no map is set
 * @param showTimestamp whether to prepend the leading "Date" column
 */
export function buildShowUserInputColumns(
    rawFieldsMap: string | undefined,
    sampleEntry: Record<string, unknown> | undefined,
    showTimestamp: boolean,
): IShowUserInputColumn[] {
    const mappings = parseFieldMappings(rawFieldsMap);
    const mapped: IShowUserInputColumn[] = mappings.length > 0
        ? mappings.map((m) => ({ key: m.field_name, label: m.field_new_name || m.field_name }))
        : Object.keys(sampleEntry ?? {})
            .filter((k) => !INTERNAL_KEYS.has(k))
            .map((k) => ({ key: k, label: k }));
    return showTimestamp ? [{ key: 'entry_date', label: 'Date' }, ...mapped] : mapped;
}
