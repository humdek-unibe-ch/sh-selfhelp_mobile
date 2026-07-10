/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Derive initial form values + target record id from a form section's
 * `section_data` payload (same shape the web `FormStyle` reads).
 */

const SKIP_FIELDS = new Set([
    'record_id',
    'entry_date',
    'id_users',
    'user_name',
    'user_code',
    'id_actionTriggerTypes',
    'triggerType',
    'id_languages',
    'language_locale',
    'language_name',
]);

type TSectionChild = { name?: { content?: string }; translatable?: { content?: string } };

export interface IFormRecordPrefill {
    recordId: number | null;
    values: Record<string, string>;
}

function isTranslatableChild(children: TSectionChild[] | undefined, fieldName: string): boolean {
    const child = children?.find((item) => item.name?.content === fieldName);
    return child?.translatable?.content === '1';
}

export function parseFormRecordPrefill(section: {
    section_data?: unknown[];
    children?: TSectionChild[];
}): IFormRecordPrefill {
    const sectionDataArray = section.section_data;
    if (!Array.isArray(sectionDataArray) || sectionDataArray.length === 0) {
        return { recordId: null, values: {} };
    }

    const recordGroups: Record<number, Record<string, string>> = {};

    for (const row of sectionDataArray) {
        if (!row || typeof row !== 'object') continue;
        const record = row as Record<string, unknown>;
        const recordId = record.record_id;
        if (typeof recordId !== 'number') continue;

        if (!recordGroups[recordId]) {
            recordGroups[recordId] = {};
        }

        for (const [fieldName, fieldValue] of Object.entries(record)) {
            if (SKIP_FIELDS.has(fieldName)) continue;
            if (fieldValue === null || fieldValue === undefined) continue;

            const languageId = record.id_languages;
            const value = String(fieldValue);
            const translatable = isTranslatableChild(section.children, fieldName);

            if (translatable) {
                if (languageId === 1) {
                    // Language id 1 = "all" / Independent seed — keep only until a
                    // real public-language row arrives (mirrors web FormStyle).
                    if (!recordGroups[recordId][fieldName]) {
                        recordGroups[recordId][fieldName] = value;
                    }
                } else if (typeof languageId === 'number') {
                    recordGroups[recordId][fieldName] = value;
                }
            } else if (languageId === 1 || !recordGroups[recordId][fieldName]) {
                recordGroups[recordId][fieldName] = value;
            }
        }
    }

    const firstRecordId = Object.keys(recordGroups)[0];
    if (!firstRecordId) {
        return { recordId: null, values: {} };
    }

    const id = Number(firstRecordId);
    return { recordId: id, values: recordGroups[id] ?? {} };
}
