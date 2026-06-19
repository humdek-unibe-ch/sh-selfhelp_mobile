/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * timeline-item — a single entry inside a `timeline` (child-only). Renders a
 * bullet marker, an optional interpolated title, and its child content. Matches
 * the shared `ITimelineItemStyle` contract; placement is enforced by the
 * backend parent/child rules. The web-only bullet/line fields
 * (`web_timeline_item_*`) and the per-item semantic `shared_color` are not yet
 * mapped on mobile.
 *
 * HeroUI Native **Pro** override (RF-31): `Stepper` step, swapped in by the Pro
 * mobile build via the `@selfhelp/mobile-pro-ui` adapter seam.
 */
import { View, Text } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { useInterpolatedField } from '@/components/renderer/useField';

export function TimelineItem({ section, values }: IStyleProps): React.ReactElement {
    const title = useInterpolatedField(section, 'title', values);

    return (
        <View
            className={buildSectionClasses(section)}
            style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}
        >
            <View
                accessibilityElementsHidden
                importantForAccessibility="no"
                style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#228be6', marginTop: 4 }}
            />
            <View style={{ flex: 1, gap: 4 }}>
                {title ? (
                    <Text accessibilityRole="header" style={{ fontWeight: '700', fontSize: 15, color: '#212529' }}>
                        {title}
                    </Text>
                ) : null}
                <Children sections={(section as { children?: never }).children} values={values} />
            </View>
        </View>
    );
}
