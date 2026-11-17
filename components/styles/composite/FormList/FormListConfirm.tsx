/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import type { ReactNode } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';

import { ListButton, type TListButtonTone } from './FormListPrimitives';
import { styles, type IListPalette } from './FormList.styles';

interface IFormListConfirmProps {
    visible: boolean;
    title: string;
    /** What is about to happen, in plain words. */
    children: ReactNode;
    confirmLabel: string;
    cancelLabel: string;
    confirmTone?: TListButtonTone;
    /** The confirmed action is running: the buttons wait. */
    busy?: boolean;
    /** Why the action did not happen (a conflict, a refusal); shown above the buttons. */
    notice?: ReactNode;
    /** Hide the confirm button (the notice says what to do instead). */
    hideConfirm?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    palette: IListPalette;
    testID?: string;
}

/**
 * The one confirmation dialog of the lists: delete, a quick action with a
 * confirmation, discarding unsaved input and restoring a version. Cancel comes
 * first, so a reflex tap or a screen reader walking the buttons never starts
 * with the destructive one; the Android back button cancels.
 */
export function FormListConfirm({
    visible,
    title,
    children,
    confirmLabel,
    cancelLabel,
    confirmTone = 'danger',
    busy = false,
    notice,
    hideConfirm = false,
    onConfirm,
    onCancel,
    palette,
    testID,
}: IFormListConfirmProps): React.ReactElement {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={busy ? undefined : onCancel}>
            <View style={[styles.scrim, { backgroundColor: palette.backdrop }]} testID={testID}>
                <View accessibilityViewIsModal style={[styles.dialog, { backgroundColor: palette.surface }]}>
                    <Text accessibilityRole="header" style={[styles.dialogTitle, { color: palette.text }]}>{title}</Text>
                    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12 }}>
                        <View>{children}</View>
                        {notice}
                    </ScrollView>
                    <View style={styles.dialogActions}>
                        <ListButton
                            label={cancelLabel}
                            onPress={onCancel}
                            disabled={busy}
                            palette={palette}
                            testID="form-list-confirm-cancel"
                        />
                        {hideConfirm ? null : (
                            <ListButton
                                label={confirmLabel}
                                onPress={onConfirm}
                                tone={confirmTone}
                                busy={busy}
                                palette={palette}
                                testID="form-list-confirm-ok"
                            />
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}
