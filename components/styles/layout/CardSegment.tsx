import { View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';

export function CardSegment({ section, values }: IStyleProps): React.ReactElement {
    return (
        <View
            className={buildSectionClasses(section)}
            style={{ marginHorizontal: -16, paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderColor: '#f1f3f5' }}
        >
            <Children sections={(section as { children?: never }).children as never} values={values} />
        </View>
    );
}
