/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Text, View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { useInterpolatedField } from '@/components/renderer/useField';
import { useAppColors } from '@/hooks/useAppColors';

/**
 * Tab — the tab panels are normally rendered by the parent `Tabs`, which reads
 * its `tab` children directly to build the label strip + the active panel. This
 * component is the standalone fallback for a `tab` section rendered OUTSIDE a
 * `Tabs` container: it shows the tab label followed by its content so nothing is
 * lost. Position within siblings = tab order in the strip.
 */
export function Tab({ section, values }: IStyleProps): React.ReactElement {
    const colors = useAppColors();
    const label = useInterpolatedField(section, 'label', values);
    return (
        <View className={buildSectionClasses(section)}>
            {label ? <Text style={{ fontWeight: '600', color: colors.text, marginBottom: 6 }}>{label}</Text> : null}
            <Children sections={(section as { children?: never }).children} values={values} />
        </View>
    );
}
