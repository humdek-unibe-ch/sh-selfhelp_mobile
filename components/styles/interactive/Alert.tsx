/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Text, View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, useInterpolatedField } from '@/components/renderer/useField';
import { resolveMantineVariant } from '@/styles/mantineVariant';
import { RADIUS_PX } from '@selfhelp/shared';
import type { TCanonicalRadius } from '@selfhelp/shared';

export function Alert({ section, values }: IStyleProps): React.ReactElement {
    const title = useInterpolatedField(section, 'mantine_alert_title', values);
    const content = useInterpolatedField(section, 'content', values);
    const color = readField<string>(section, 'mantine_color') ?? 'blue';
    const variant = readField<string>(section, 'mantine_variant') ?? 'light';
    const radius = readField<string>(section, 'mantine_radius') ?? 'md';

    const v = resolveMantineVariant(variant, color);
    const isFilled = variant === 'filled';

    return (
        <View
            className={buildSectionClasses(section)}
            style={{
                backgroundColor: v.background,
                borderLeftWidth: variant === 'outline' ? 0 : 4,
                borderLeftColor: v.accent,
                borderWidth: v.borderWidth,
                borderColor: v.border,
                borderRadius: RADIUS_PX[radius as TCanonicalRadius] ?? 8,
                paddingVertical: 12,
                paddingHorizontal: 14,
                marginVertical: 8,
                gap: 4,
            }}
        >
            {title ? (
                <Text style={{ fontWeight: '700', fontSize: 15, color: v.foreground, letterSpacing: 0.1 }}>
                    {title}
                </Text>
            ) : null}
            {content ? (
                <Text style={{ color: v.foreground, fontSize: 14, lineHeight: 20, opacity: isFilled ? 0.95 : 1 }}>
                    {content}
                </Text>
            ) : null}
            <Children sections={(section as { children?: never }).children} values={values} />
        </View>
    );
}
