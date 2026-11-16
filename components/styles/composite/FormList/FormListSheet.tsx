/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListButton } from './FormListPrimitives';
import { styles, type IListPalette } from './FormList.styles';

interface IFormListSheetProps {
    visible: boolean;
    title: string;
    closeLabel: string;
    onRequestClose: () => void;
    palette: IListPalette;
    children: ReactNode;
}

/**
 * The record of a list in a full-screen sheet over the screen (form
 * presentation `modal`). Long forms scroll inside it and keep the focused
 * input above the keyboard; the Android back button and the Close button both
 * go through `onRequestClose`, which asks first when there is unsaved input.
 */
export function FormListSheet({ visible, title, closeLabel, onRequestClose, palette, children }: IFormListSheetProps): React.ReactElement {
    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={onRequestClose}
        >
            <SafeAreaView style={[styles.sheet, { backgroundColor: palette.background }]} testID="form-list-sheet">
                <View style={[styles.sheetHeader, { borderColor: palette.border, backgroundColor: palette.surface }]}>
                    <Text accessibilityRole="header" numberOfLines={2} style={[styles.sheetTitle, { color: palette.text }]}>
                        {title}
                    </Text>
                    <ListButton label={closeLabel} onPress={onRequestClose} palette={palette} testID="form-list-sheet-close" />
                </View>
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <ScrollView
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                        contentContainerStyle={styles.sheetBody}
                    >
                        {children}
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Modal>
    );
}
