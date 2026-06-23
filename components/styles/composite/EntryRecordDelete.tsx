/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { useState } from 'react';
import { Alert, Pressable, Text } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, useInterpolatedField } from '@/components/renderer/useField';
import { deleteFormRecord } from '@/services/formsService';

/**
 * Delete trigger for an entryRecord. Shows a native confirmation
 * dialog (matching the web `jquery-confirm` UX), then sends the
 * `record_id` (auto-injected by the backend hydration) to
 * `/forms/delete`. The surrounding entryRecord disappears once the
 * page query refetches.
 */
export function EntryRecordDelete({ section, values }: IStyleProps): React.ReactElement {
    const label = useInterpolatedField(section, 'label', values) || 'Delete';
    const confirmTitle = useInterpolatedField(section, 'confirmation_title', values) || 'Delete entry?';
    const confirmContinue = useInterpolatedField(section, 'confirmation_continue', values) || 'Delete';
    const confirmCancel = useInterpolatedField(section, 'confirmation_cancel', values) || 'Cancel';
    const recordId = readField<number>(section, 'record_id');
    // The backend delete requires `page_id`; `PageRenderer` seeds it into values.
    const pageId = typeof values.page_id === 'number' ? values.page_id : Number(values.page_id);
    const queryClient = useQueryClient();

    const [busy, setBusy] = useState(false);

    const onConfirmedDelete = async (): Promise<void> => {
        if (typeof recordId !== 'number') return;
        setBusy(true);
        const result = await deleteFormRecord({
            section_id: section.id,
            page_id: pageId,
            record_id: recordId,
        });
        setBusy(false);
        // Refetch the page so the deleted entry disappears from the list.
        if (result.kind === 'ok') {
            void queryClient.invalidateQueries({ queryKey: ['page'] });
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
            disabled={busy}
            className={buildSectionClasses(section)}
            style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                backgroundColor: busy ? '#adb5bd' : '#fa5252',
                borderRadius: 4,
                alignSelf: 'flex-start',
            }}
        >
            <Text style={{ color: '#fff', fontWeight: '600' }}>{label}</Text>
        </Pressable>
    );
}
