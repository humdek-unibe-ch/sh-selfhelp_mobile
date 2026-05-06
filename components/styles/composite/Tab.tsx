import { Pressable, Text, View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { useInterpolatedField } from '@/components/renderer/useField';
import { useTabsContext } from './Tabs';

/**
 * Self-contained tab: renders its label in the parent tab strip and its
 * content below. Position within siblings = tab index. v1 doesn't
 * support deep nesting; flatten in the CMS.
 */
export function Tab({ section, values }: IStyleProps): React.ReactElement | null {
    const ctx = useTabsContext();
    const label = useInterpolatedField(section, 'label', values);
    if (!ctx) return null;
    const idx = section.position ?? 0;
    const active = ctx.active === idx;

    return (
        <View>
            <Pressable
                onPress={() => ctx.setActive(idx)}
                className={buildSectionClasses(section)}
                style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 2, borderColor: active ? '#228be6' : 'transparent' }}
            >
                <Text style={{ color: active ? '#228be6' : '#495057', fontWeight: active ? '600' : '400' }}>{label}</Text>
            </Pressable>
            {active ? (
                <View style={{ padding: 12 }}>
                    <Children sections={(section as { children?: never }).children as never} values={values} />
                </View>
            ) : null}
        </View>
    );
}
