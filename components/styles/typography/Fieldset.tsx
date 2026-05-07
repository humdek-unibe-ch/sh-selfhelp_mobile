/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Text, View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { Children } from '@/components/renderer/Children';
import { readField, useInterpolatedField } from '@/components/renderer/useField';
import { RADIUS_PX } from '@selfhelp/shared';
import type { TCanonicalRadius } from '@selfhelp/shared';

export function Fieldset({ section, values }: IStyleProps): React.ReactElement {
    const legendField = useInterpolatedField(section, 'legend', values);
    const labelField = useInterpolatedField(section, 'label', values);
    const legend = legendField || labelField;
    const radius = readField<string>(section, 'mantine_radius') ?? 'sm';
    return (
        <View
            className={buildSectionClasses(section)}
            style={{ borderWidth: 1, borderColor: '#dee2e6', borderRadius: RADIUS_PX[radius as TCanonicalRadius] ?? 4, padding: 12, marginVertical: 8 }}
        >
            {legend ? <Text style={{ fontWeight: '600', marginBottom: 8 }}>{legend}</Text> : null}
            <Children sections={(section as { children?: never }).children as never} values={values} />
        </View>
    );
}
