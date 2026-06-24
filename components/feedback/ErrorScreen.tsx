/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Pressable, Text, View } from 'react-native';

import { useAppColors } from '@/hooks/useAppColors';

interface IErrorScreenProps {
    title?: string;
    message?: string;
    onRetry?: () => void;
    actionLabel?: string;
    onAction?: () => void;
}

export function ErrorScreen({
    title = 'Something went wrong',
    message,
    onRetry,
    actionLabel,
    onAction,
}: IErrorScreenProps): React.ReactElement {
    // Theme-aware so the not-found / no-access / error surfaces read correctly in
    // dark mode (a black-on-dark title + grey button used to look broken).
    const colors = useAppColors();
    return (
        <View
            style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
                backgroundColor: colors.background,
            }}
        >
            <Text
                style={{
                    fontSize: 18,
                    fontWeight: '600',
                    marginBottom: 8,
                    color: colors.text,
                    textAlign: 'center',
                }}
            >
                {title}
            </Text>
            {message ? (
                <Text style={{ color: colors.textMuted, textAlign: 'center', marginBottom: 16 }}>
                    {message}
                </Text>
            ) : null}
            {onRetry ? (
                <Pressable
                    onPress={onRetry}
                    style={{
                        paddingVertical: 8,
                        paddingHorizontal: 16,
                        backgroundColor: colors.primary,
                        borderRadius: 8,
                        marginBottom: 8,
                    }}
                >
                    <Text style={{ color: colors.onPrimary, fontWeight: '600' }}>Retry</Text>
                </Pressable>
            ) : null}
            {onAction ? (
                <Pressable
                    onPress={onAction}
                    style={{
                        paddingVertical: 8,
                        paddingHorizontal: 16,
                        backgroundColor: colors.surfaceMuted,
                        borderRadius: 8,
                    }}
                >
                    <Text style={{ color: colors.text, fontWeight: '600' }}>
                        {actionLabel ?? 'Continue'}
                    </Text>
                </Pressable>
            ) : null}
        </View>
    );
}
