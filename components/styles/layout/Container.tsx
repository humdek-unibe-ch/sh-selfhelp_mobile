import { View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readBooleanField } from '@/components/renderer/useField';
import { CONTAINER_SIZE_PX } from '@selfhelp/shared';
import type { TMantineSize } from '@selfhelp/shared';

export function Container({ section, values }: IStyleProps): React.ReactElement {
    const size = readField<TMantineSize>(section, 'mantine_size') ?? 'md';
    const fluid = readBooleanField(section, 'mantine_fluid', false);
    const maxWidth = fluid ? undefined : CONTAINER_SIZE_PX[size as TMantineSize] ?? CONTAINER_SIZE_PX.md;

    return (
        <View
            className={buildSectionClasses(section)}
            style={{ width: '100%', alignSelf: 'center', maxWidth, paddingHorizontal: 16 }}
        >
            <Children sections={(section as { children?: never }).children as never} values={values} />
        </View>
    );
}
