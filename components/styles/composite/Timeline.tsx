import { View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';

export function Timeline({ section, values }: IStyleProps): React.ReactElement {
    return (
        <View className={buildSectionClasses(section)} style={{ borderLeftWidth: 2, borderColor: '#dee2e6', paddingLeft: 16, marginLeft: 8 }}>
            <Children sections={(section as { children?: never }).children as never} values={values} />
        </View>
    );
}
