import { View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';

/**
 * `loop` is also data-bound on the backend; same approach as entryList.
 */
export function Loop({ section, values }: IStyleProps): React.ReactElement {
    return (
        <View className={buildSectionClasses(section)}>
            <Children sections={(section as { children?: never }).children as never} values={values} />
        </View>
    );
}
