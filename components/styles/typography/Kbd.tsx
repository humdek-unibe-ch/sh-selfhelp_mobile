/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Text } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readStringField } from '@/components/renderer/useField';
import { useAppColors } from '@/hooks/useAppColors';

export function Kbd({ section }: IStyleProps): React.ReactElement {
    const label = readStringField(section, 'label');
    const colors = useAppColors();
    return (
        <Text
            className={buildSectionClasses(section)}
            style={{
                fontFamily: 'Courier',
                color: colors.text,
                backgroundColor: colors.surfaceMuted,
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 3,
                borderWidth: 1,
                borderColor: colors.border,
                fontSize: 13,
            }}
        >
            {label}
        </Text>
    );
}
