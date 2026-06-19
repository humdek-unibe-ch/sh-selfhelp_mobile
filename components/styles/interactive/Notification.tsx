/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Text, View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { useInterpolatedField } from '@/components/renderer/useField';
import { mobileStyleProps, mobileIntentPalette } from '@/components/ui/mobileStyleProps';
import { useAppColors } from '@/hooks/useAppColors';

export function Notification({ section, values }: IStyleProps): React.ReactElement {
    const title = useInterpolatedField(section, 'title', values);
    const content = useInterpolatedField(section, 'content', values);
    const resolved = mobileStyleProps(section);
    const { palette } = mobileIntentPalette(section, 'filled');
    const accent = palette.accent;
    const colors = useAppColors();

    return (
        <View
            className={buildSectionClasses(section)}
            style={{
                backgroundColor: colors.surface,
                padding: 12,
                borderRadius: resolved.radiusPx ?? 4,
                borderLeftWidth: 4,
                borderLeftColor: accent,
                shadowColor: '#000',
                shadowOpacity: 0.06,
                shadowOffset: { width: 0, height: 2 },
                shadowRadius: 4,
                elevation: 2,
                marginVertical: 6,
            }}
        >
            {title ? <Text style={{ fontWeight: '600', marginBottom: 4, color: colors.text }}>{title}</Text> : null}
            {content ? <Text style={{ color: colors.textMuted }}>{content}</Text> : null}
        </View>
    );
}
