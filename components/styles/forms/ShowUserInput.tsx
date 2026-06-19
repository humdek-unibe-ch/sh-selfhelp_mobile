/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * show-user-input — displays previously submitted user input as a mobile-
 * friendly list of cards (rather than a desktop table; plan section 11.6). Each
 * entry is resolved on the section as `entries` (`IShowUserInputEntry[]`).
 * Internal bookkeeping keys (`record_id`, `id_users`, `_can_delete`) are hidden.
 * The web-only DataTable options (`dt_*`, `web_table_*`) are intentionally
 * ignored on mobile.
 */
import { View, Text } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';

interface IUserInputEntry {
    record_id: number;
    id_users: number;
    _can_delete?: boolean;
    [key: string]: unknown;
}

const INTERNAL_KEYS = new Set(['record_id', 'id_users', '_can_delete']);

function entryRows(entry: IUserInputEntry): { key: string; value: string }[] {
    return Object.entries(entry)
        .filter(([key]) => !INTERNAL_KEYS.has(key))
        .map(([key, value]) => ({ key, value: value === null || value === undefined ? '' : String(value) }));
}

export function ShowUserInput({ section }: IStyleProps): React.ReactElement {
    const entries = (section as { entries?: IUserInputEntry[] }).entries ?? [];

    if (entries.length === 0) {
        return (
            <View className={buildSectionClasses(section)} style={{ paddingVertical: 16 }}>
                <Text accessibilityRole="text" style={{ color: '#868e96', fontStyle: 'italic' }}>
                    No entries yet.
                </Text>
            </View>
        );
    }

    return (
        <View className={buildSectionClasses(section)} style={{ gap: 12 }}>
            {entries.map((entry) => (
                <View
                    key={entry.record_id}
                    accessibilityRole="summary"
                    style={{
                        borderWidth: 1,
                        borderColor: '#dee2e6',
                        borderRadius: 10,
                        padding: 14,
                        gap: 6,
                        backgroundColor: '#ffffff',
                    }}
                >
                    {entryRows(entry).map((row) => (
                        <View key={row.key} style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                            <Text style={{ fontWeight: '600', color: '#495057' }}>{row.key}:</Text>
                            <Text style={{ flex: 1, color: '#212529' }}>{row.value}</Text>
                        </View>
                    ))}
                </View>
            ))}
        </View>
    );
}
