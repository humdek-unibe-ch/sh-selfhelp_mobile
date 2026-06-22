/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * timeline-item — a single entry inside a `timeline` (child-only). Renders a
 * left rail (themed dot + connecting line) next to an optional interpolated
 * title and its child content. The dot and the line share one centered column,
 * so they always align and the line connects to the next item's dot regardless
 * of content height. Colours come from `useAppColors`, so the marker/line/title
 * stay legible in light + dark (the old hard-coded `#228be6` / `#dee2e6` left a
 * pale, disconnected rail in dark mode). Matches the shared `ITimelineItemStyle`
 * contract; placement is enforced by the backend parent/child rules. The
 * web-only bullet/line fields (`web_timeline_item_*`) and the per-item semantic
 * `shared_color` are not yet mapped on mobile.
 *
 * HeroUI Native **Pro** override (RF-31): `Stepper` step, swapped in by the Pro
 * mobile build via the `@selfhelp/mobile-pro-ui` adapter seam.
 */
import { View, Text } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { useInterpolatedField } from '@/components/renderer/useField';
import { useAppColors } from '@/hooks/useAppColors';

export function TimelineItem({ section, values }: IStyleProps): React.ReactElement {
    const title = useInterpolatedField(section, 'title', values);
    const colors = useAppColors();

    return (
        <View className={buildSectionClasses(section)} style={{ flexDirection: 'row' }}>
            <View
                accessibilityElementsHidden
                importantForAccessibility="no"
                style={{ width: 24, alignItems: 'center' }}
            >
                <View
                    style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: colors.primary,
                        marginTop: 4,
                    }}
                />
                <View
                    style={{ flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 4, minHeight: 12 }}
                />
            </View>
            <View style={{ flex: 1, paddingBottom: 20, gap: 4 }}>
                {title ? (
                    <Text accessibilityRole="header" style={{ fontWeight: '700', fontSize: 15, color: colors.text }}>
                        {title}
                    </Text>
                ) : null}
                <Children sections={(section as { children?: never }).children} values={values} />
            </View>
        </View>
    );
}
