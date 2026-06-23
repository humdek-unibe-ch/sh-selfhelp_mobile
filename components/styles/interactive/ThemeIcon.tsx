/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Text, View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField } from '@/components/renderer/useField';
import type { TMantineSize } from '@selfhelp/shared';
import { mobileStyleProps, mobileIntentPalette } from '@/components/ui/mobileStyleProps';

const SIZE_PX: Record<TMantineSize, number> = { xs: 16, sm: 20, md: 28, lg: 36, xl: 48 };

/**
 * ThemeIcon — small colored icon container. HeroUI Native has no direct
 * equivalent, so this is a clean RN fallback driven by the shared semantic
 * model: `intent` -> color (via the shared mapper), `size`, `radius`.
 */
export function ThemeIcon({ section }: IStyleProps): React.ReactElement {
    const resolved = mobileStyleProps(section);
    const { palette, variant } = mobileIntentPalette(section, 'filled');
    const size = (readField<string>(section, 'size') as TMantineSize | undefined) ?? 'md';
    const icon = readField<string>(section, 'left_icon') ?? readField<string>(section, 'web_left_icon') ?? '★';

    const dim = SIZE_PX[size] ?? 28;
    const isFilled = variant === 'filled';

    return (
        <View
            className={buildSectionClasses(section)}
            style={{
                width: dim,
                height: dim,
                borderRadius: resolved.radiusPx ?? 4,
                backgroundColor: isFilled ? palette.accent : palette.background,
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Text style={{ color: isFilled ? '#fff' : palette.foreground, fontSize: dim * 0.55 }}>{icon}</Text>
        </View>
    );
}
