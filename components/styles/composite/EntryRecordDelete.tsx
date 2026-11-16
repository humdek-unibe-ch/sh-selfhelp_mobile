/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { useState } from 'react';
import { Alert, Pressable, Text } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { asRecordVersion } from '@selfhelp/shared';

import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, useInterpolatedField } from '@/components/renderer/useField';
import { deleteFormRecord } from '@/services/formsService';
import { describeFormFailure } from '@/services/formResults';
import { useWritePreview } from '@/hooks/useWritePreview';

/**
 * Delete trigger for an entryRecord. Shows a native confirmation
 * dialog (matching the web `jquery-confirm` UX), then sends the
 * `record_id` and `record_version` (both auto-injected by the backend
 * hydration) to `/forms/delete`. The server refuses a delete that names no
 * version, or an old one (409: someone changed the entry meanwhile, nothing is
 * deleted): without a version the trigger is disabled, and a stale answer is
 * told. The surrounding entryRecord disappears once the page query refetches.
 */
export function EntryRecordDelete({ section, values }: IStyleProps): React.ReactElement {
    // `label_delete` is the style's catalog field (the generic `label` field is
    // not linked to entry-record-delete, so it can never carry CMS content here).
    const label = useInterpolatedField(section, 'label_delete', values) || 'Delete';
    const confirmTitle = useInterpolatedField(section, 'confirmation_title', values) || 'Delete entry?';
    const confirmContinue = useInterpolatedField(section, 'confirmation_continue', values) || 'Delete';
    const confirmCancel = useInterpolatedField(section, 'confirmation_cancel', values) || 'Cancel';
    const recordId = readField<number>(section, 'record_id');
    // The version of the record the page was built with; the server refuses a delete that names none.
    const recordVersion = asRecordVersion(readField<unknown>(section, 'record_version'));
    // The backend delete requires `page_id`; `PageRenderer` seeds it into values.
    const pageId = typeof values.page_id === 'number' ? values.page_id : Number(values.page_id);
    const queryClient = useQueryClient();
    // The delete acts on the page version the person looks at (the draft only in preview mode).
    const preview = useWritePreview();

    const [busy, setBusy] = useState(false);
    const canDelete = typeof recordId === 'number' && recordVersion !== null;

    const onConfirmedDelete = async (): Promise<void> => {
        if (typeof recordId !== 'number' || recordVersion === null) return;
        setBusy(true);
        const result = await deleteFormRecord({
            section_id: section.id,
            page_id: pageId,
            record_id: recordId,
            expected_version: recordVersion,
            ...(preview ? { preview: true } : {}),
        });
        setBusy(false);
        // Refetch the page so the deleted entry disappears from the list.
        if (result.kind === 'ok') {
            void queryClient.invalidateQueries({ queryKey: ['page'] });
        } else {
            // A stale delete wrote nothing: say so (the page is read again, so the person sees the latest version).
            Alert.alert('Error', describeFormFailure(result, 'Failed to delete entry.'));
            if (result.kind === 'stale') {
                void queryClient.invalidateQueries({ queryKey: ['page'] });
            }
        }
    };

    const onPress = (): void => {
        Alert.alert(confirmTitle, undefined, [
            { text: confirmCancel, style: 'cancel' },
            {
                text: confirmContinue,
                style: 'destructive',
                onPress: () => {
                    void onConfirmedDelete();
                },
            },
        ]);
    };

    return (
        <Pressable
            onPress={onPress}
            disabled={busy || !canDelete}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy || !canDelete, busy }}
            className={buildSectionClasses(section)}
            style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                backgroundColor: busy || !canDelete ? '#adb5bd' : '#fa5252',
                borderRadius: 4,
                alignSelf: 'flex-start',
            }}
        >
            <Text style={{ color: '#fff', fontWeight: '600' }}>{label}</Text>
        </Pressable>
    );
}
