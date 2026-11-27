/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Text, View } from 'react-native';

import { useAppColors } from '@/hooks/useAppColors';

interface IPageNoticeProps {
    title: string;
    message?: string;
    testID?: string;
}

/**
 * A short notice drawn on a page without taking the page away: "you may no longer view this page", "this form
 * was removed". It is announced to screen readers when it appears (role `alert`, polite live region) and says
 * its meaning in words, not by colour alone.
 */
export function PageNotice({ title, message, testID }: IPageNoticeProps): React.ReactElement {
    const colors = useAppColors();
    return (
        <View
            testID={testID}
            accessible
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            accessibilityLabel={message ? `${title}. ${message}` : title}
            style={{
                margin: 12,
                padding: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surfaceMuted,
            }}
        >
            <Text style={{ fontWeight: '600', color: colors.text }}>{title}</Text>
            {message ? <Text style={{ marginTop: 4, color: colors.textMuted }}>{message}</Text> : null}
        </View>
    );
}
