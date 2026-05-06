import { useState } from 'react';
import { Alert, Pressable, Text } from 'react-native';

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

    const [busy, setBusy] = useState(false);

    const onConfirmedDelete = async (): Promise<void> => {
        setBusy(true);
        await deleteFormRecord({
            section_id: section.id,
            record_id: typeof recordId === 'number' ? recordId : undefined,
        });
        setBusy(false);
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
