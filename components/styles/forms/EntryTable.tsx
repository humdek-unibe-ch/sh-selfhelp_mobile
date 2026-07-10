/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * entry-table (renamed from show-user-input) — displays previously submitted user input as a mobile-
 * friendly list of cards (rather than a desktop table; plan section 11.6). Each
 * entry is resolved on the section as `entries` (`IEntryTableEntry[]`).
 * Internal bookkeeping keys (`record_id`, `id_users`, `_can_delete`, `_can_edit`) are hidden.
 * The web-only DataTable options (`dt_*`, `web_table_*`) are intentionally
 * ignored on mobile.
 *
 * Deletion: when the author enables `delete_entry`, each card the user is
 * allowed to remove (`_can_delete`) gets a Delete button that confirms, posts to
 * `/forms/delete` (with the page id the backend requires), then refetches the
 * page so the row disappears — same contract as the web table's delete column.
 *
 * Edit: when `edit_url` is set (template with `{record_id}`), each card the user
 * may edit (`_can_edit !== false`) gets an Edit action that navigates via
 * `navigateToPage` — same CMS-in-CMS affordance as the web pencil column.
 * Optional `add_url` renders an "Add new" control above the list.
 *
 * Columns: like the web table, the author picks which fields show (and their
 * labels) through the `fields_map` JSON; with no mapping every data key is shown.
 * `show_timestamp` adds a leading "Date" column.
 *
 * Theme-aware: every colour resolves through `useAppColors` so the cards stay
 * legible in dark + light. `title` (optional heading) and `empty_text`
 * (empty-state message) are author-configurable content fields.
 */
import { useMemo, useState } from 'react';
import { Alert, Pressable, View, Text } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readBooleanField, readField, useInterpolatedField } from '@/components/renderer/useField';
import { useAppColors } from '@/hooks/useAppColors';
import { navigateToPage } from '@/components/shell/usePageNavigation';
import { deleteFormRecord } from '@/services/formsService';
import { buildEntryTableColumns, type IEntryTableColumn } from './entryTableColumns';
import { resolveEntryTableEditUrl } from './entryTableEditUrl';

interface IUserInputEntry {
    record_id: number;
    id_users: number;
    _can_delete?: boolean;
    _can_edit?: boolean;
    [key: string]: unknown;
}

function entryRows(entry: IUserInputEntry, columns: IEntryTableColumn[]): { key: string; label: string; value: string }[] {
    return columns.map((col) => {
        const value = entry[col.key];
        return { key: col.key, label: col.label, value: value === null || value === undefined ? '' : String(value) };
    });
}

export function EntryTable({ section, values }: IStyleProps): React.ReactElement {
    const colors = useAppColors();
    const queryClient = useQueryClient();
    const heading = useInterpolatedField(section, 'title', values);
    const emptyText = useInterpolatedField(section, 'empty_text', values) || 'No entries found.';
    const entries = useMemo<IUserInputEntry[]>(
        () => (section as { entries?: IUserInputEntry[] }).entries ?? [],
        [section]
    );
    // Issue #56 v2: header labels come from the section's `field_labels`
    // (`field_key => display_name`) map, so a renamed column relabels the header
    // automatically. Absent on older hosts → columns fall back to the key.
    const fieldLabels = useMemo<Record<string, string>>(
        () => (section as { field_labels?: Record<string, string> }).field_labels ?? {},
        [section]
    );

    // Author-selected columns (fields_map) + optional leading timestamp column.
    const showTimestamp = readBooleanField(section, 'show_timestamp', false);
    const rawFieldsMap = readField<string>(section, 'fields_map');
    const rawFieldsMapLabels = readField<string>(section, 'fields_map_labels');
    const columns = useMemo<IEntryTableColumn[]>(
        () => buildEntryTableColumns(rawFieldsMap, entries[0], showTimestamp, fieldLabels, rawFieldsMapLabels),
        [rawFieldsMap, rawFieldsMapLabels, entries, showTimestamp, fieldLabels]
    );

    const deleteEnabled = readBooleanField(section, 'delete_entry', false);
    const deleteTitle = useInterpolatedField(section, 'delete_modal_title', values) || 'Delete entry';
    const deleteBody = useInterpolatedField(section, 'delete_modal_body', values) || 'This action cannot be undone.';
    const addUrl = (readField<string>(section, 'add_url') ?? '').trim();
    const editUrl = (readField<string>(section, 'edit_url') ?? '').trim();
    // The backend delete requires `page_id`; `PageRenderer` seeds it into values.
    const pageId = typeof values.page_id === 'number' ? values.page_id : Number(values.page_id);
    const [busyId, setBusyId] = useState<number | null>(null);

    const runDelete = async (recordId: number): Promise<void> => {
        setBusyId(recordId);
        const result = await deleteFormRecord({ section_id: section.id, page_id: pageId, record_id: recordId });
        setBusyId(null);
        if (result.kind === 'ok') {
            void queryClient.invalidateQueries({ queryKey: ['page'] });
        } else {
            Alert.alert('Error', result.message || 'Failed to delete entry.');
        }
    };

    const confirmDelete = (recordId: number): void => {
        Alert.alert(deleteTitle, deleteBody, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => { void runDelete(recordId); } },
        ]);
    };

    const header = (
        <View style={{ gap: 8, marginBottom: entries.length === 0 ? 0 : 4 }}>
            {heading ? (
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{heading}</Text>
            ) : null}
            {addUrl ? (
                <Pressable
                    onPress={() => navigateToPage(addUrl)}
                    accessibilityRole="button"
                    accessibilityLabel="Add new entry"
                    style={{
                        alignSelf: 'flex-start',
                        paddingVertical: 8,
                        paddingHorizontal: 14,
                        borderRadius: 6,
                        backgroundColor: colors.primary,
                    }}
                >
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Add new</Text>
                </Pressable>
            ) : null}
        </View>
    );

    if (entries.length === 0) {
        return (
            <View className={buildSectionClasses(section)} style={{ paddingVertical: 16, gap: 8 }}>
                {header}
                <Text accessibilityRole="text" style={{ color: colors.textMuted, fontStyle: 'italic' }}>
                    {emptyText}
                </Text>
            </View>
        );
    }

    return (
        <View className={buildSectionClasses(section)} style={{ gap: 12 }}>
            {header}
            {entries.map((entry) => {
                const canEdit = editUrl !== '' && entry._can_edit !== false;
                const canDelete = deleteEnabled && Boolean(entry._can_delete);
                return (
                    <View
                        key={entry.record_id}
                        accessibilityRole="summary"
                        style={{
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 10,
                            padding: 14,
                            gap: 6,
                            backgroundColor: colors.surface,
                        }}
                    >
                        {entryRows(entry, columns).map((row) => (
                            <View key={row.key} style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                                <Text style={{ fontWeight: '600', color: colors.textMuted }}>{row.label}:</Text>
                                <Text style={{ flex: 1, color: colors.text }}>{row.value}</Text>
                            </View>
                        ))}
                        {(canEdit || canDelete) ? (
                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                                {canEdit ? (
                                    <Pressable
                                        onPress={() => navigateToPage(resolveEntryTableEditUrl(editUrl, entry.record_id))}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Edit entry ${entry.record_id}`}
                                        style={{
                                            paddingVertical: 6,
                                            paddingHorizontal: 14,
                                            borderRadius: 6,
                                            borderWidth: 1,
                                            borderColor: colors.primary,
                                        }}
                                    >
                                        <Text style={{ color: colors.primary, fontWeight: '600' }}>Edit</Text>
                                    </Pressable>
                                ) : null}
                                {canDelete ? (
                                    <Pressable
                                        onPress={() => confirmDelete(entry.record_id)}
                                        disabled={busyId === entry.record_id}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Delete entry ${entry.record_id}`}
                                        style={{
                                            paddingVertical: 6,
                                            paddingHorizontal: 14,
                                            borderRadius: 6,
                                            borderWidth: 1,
                                            borderColor: colors.danger,
                                            opacity: busyId === entry.record_id ? 0.5 : 1,
                                        }}
                                    >
                                        <Text style={{ color: colors.danger, fontWeight: '600' }}>Delete</Text>
                                    </Pressable>
                                ) : null}
                            </View>
                        ) : null}
                    </View>
                );
            })}
        </View>
    );
}
