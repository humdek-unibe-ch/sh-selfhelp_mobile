/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Text } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, useInterpolatedField } from '@/components/renderer/useField';
import { FieldShell } from './_FieldShell';

/**
 * RangeSlider placeholder. A real implementation needs two thumbs
 * (e.g. `react-native-awesome-slider`). v1 surfaces the value but
 * doesn't let users drag — backend-driven default values still work.
 */
export function RangeSlider({ section, values }: IStyleProps): React.ReactElement {
    const label = useInterpolatedField(section, 'label', values);
    const description = useInterpolatedField(section, 'description', values);
    const value = readField<string>(section, 'value') ?? '';
    return (
        <FieldShell label={label} description={description} className={buildSectionClasses(section)}>
            <Text style={{ color: '#495057' }}>{value || '—'}</Text>
        </FieldShell>
    );
}
