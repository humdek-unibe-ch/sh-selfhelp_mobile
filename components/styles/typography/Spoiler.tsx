import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { useInterpolatedField } from '@/components/renderer/useField';

export function Spoiler({ section, values }: IStyleProps): React.ReactElement {
    const [open, setOpen] = useState(false);
    const showLabel = useInterpolatedField(section, 'mantine_spoiler_show_label', values) || 'Show';
    const hideLabel = useInterpolatedField(section, 'mantine_spoiler_hide_label', values) || 'Hide';

    return (
        <View className={buildSectionClasses(section)}>
            <View style={open ? undefined : { maxHeight: 80, overflow: 'hidden' }}>
                <Children sections={(section as { children?: never }).children as never} values={values} />
            </View>
            <Pressable onPress={() => setOpen((v) => !v)} style={{ marginTop: 8 }}>
                <Text style={{ color: '#228be6', fontWeight: '600' }}>{open ? hideLabel : showLabel}</Text>
            </Pressable>
        </View>
    );
}
