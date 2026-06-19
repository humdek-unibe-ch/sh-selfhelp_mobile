/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { readField } from '@/components/renderer/useField';
import { SPACING_PX } from '@selfhelp/shared';
import type { TCanonicalSpacing } from '@selfhelp/shared';

export function Space({ section }: IStyleProps): React.ReactElement {
    const size = readField<string>(section, 'shared_size') ?? 'md';
    const direction = readField<string>(section, 'web_space_direction') ?? 'vertical';
    const px = SPACING_PX[size as TCanonicalSpacing] ?? 16;
    return <View style={direction === 'horizontal' ? { width: px } : { height: px }} />;
}
