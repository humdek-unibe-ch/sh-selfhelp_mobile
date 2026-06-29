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
 *
 * Issue #56 v2: rows are keyed by the immutable data-column `field_key`, and the
 * human label travels in a separate `field_labels` (`field_key => display_name`)
 * map. Default headers therefore show the display name (falling back to the
 * key), and a `fields_map` mapping resolves to a real data key by `field_key`
 * first, then by the current `display_name`, so renaming a column never breaks
 * an existing mapping. On an older host (entries keyed by name, no
 * `field_labels`) every branch falls back to the key, preserving the previous
 * behaviour.
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
 * @param fieldLabels   `field_key => display_name` map from the section payload
 *                      (issue #56 v2); empty on older hosts
 */
export function buildShowUserInputColumns(
    rawFieldsMap: string | undefined,
    sampleEntry: Record<string, unknown> | undefined,
    showTimestamp: boolean,
    fieldLabels: Record<string, string> = {},
): IShowUserInputColumn[] {
    const mappings = parseFieldMappings(rawFieldsMap);
    const dataKeys = Object.keys(sampleEntry ?? {}).filter((k) => !INTERNAL_KEYS.has(k));
    const mapped: IShowUserInputColumn[] = mappings.length > 0
        ? mappings
            .map((m): IShowUserInputColumn | null => {
                // Resolve the author's mapping to a real data key: by immutable
                // field_key first, then by the current display_name.
                const key = dataKeys.includes(m.field_name)
                    ? m.field_name
                    : dataKeys.find((k) => fieldLabels[k] === m.field_name);
                if (key === undefined) return null;
                return { key, label: m.field_new_name || fieldLabels[key] || key };
            })
            .filter((c): c is IShowUserInputColumn => c !== null)
        : dataKeys.map((k) => ({ key: k, label: fieldLabels[k] || k }));
    return showTimestamp ? [{ key: 'entry_date', label: 'Date' }, ...mapped] : mapped;
}
