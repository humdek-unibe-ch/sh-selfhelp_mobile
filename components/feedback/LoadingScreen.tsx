/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { ActivityIndicator, Text, View } from 'react-native';

import { useAppColors } from '@/hooks/useAppColors';

interface ILoadingScreenProps {
    message?: string;
}

export function LoadingScreen({ message }: ILoadingScreenProps): React.ReactElement {
    // Theme-aware so the loading state matches the active scheme (the bare
    // default background flashed white inside a dark themed frame).
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
            <ActivityIndicator size="large" color={colors.primary} />
            {message ? <Text style={{ marginTop: 12, color: colors.textMuted }}>{message}</Text> : null}
        </View>
    );
}
