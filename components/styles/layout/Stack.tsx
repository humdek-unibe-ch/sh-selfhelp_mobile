import { View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField } from '@/components/renderer/useField';
import { ALIGN_TO_CLASS, JUSTIFY_TO_CLASS, gapToClass } from '@/styles/mantineToTailwind';

export function Stack({ section, values }: IStyleProps): React.ReactElement {
    const justify = readField<string>(section, 'mantine_justify');
    const align = readField<string>(section, 'mantine_align') ?? 'stretch';
    const gap = readField<string>(section, 'mantine_gap') ?? 'md';

    const extra = [
        'flex',
        'flex-col',
        justify ? JUSTIFY_TO_CLASS[justify] : undefined,
        ALIGN_TO_CLASS[align] ?? 'items-stretch',
        gapToClass(gap),
    ];

    return (
        <View className={buildSectionClasses(section, { extra })}>
            <Children sections={(section as { children?: never }).children as never} values={values} />
        </View>
    );
}
