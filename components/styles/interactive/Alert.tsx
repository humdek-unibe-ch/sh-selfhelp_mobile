/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Alert as HeroAlert } from 'heroui-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readBooleanField, useInterpolatedField } from '@/components/renderer/useField';
import { mobileStyleProps } from '@/components/ui/mobileStyleProps';
import { useAppColors } from '@/hooks/useAppColors';

/**
 * Alert — renders the HeroUI Native `Alert` compound (status indicator + title +
 * description) on every platform, including web. The status/color comes from the
 * shared `intent` field via the shared mapper (HeroUI status vocabulary matches
 * `accent|default|success|warning|danger`). When the cross-platform `closable`
 * field is set the alert shows a dismiss button (mirrors the web close button).
 */
export function Alert({ section, values }: IStyleProps): React.ReactElement | null {
    const title = useInterpolatedField(section, 'alert_title', values);
    const content = useInterpolatedField(section, 'content', values);
    const resolved = mobileStyleProps(section);
    const closable = readBooleanField(section, 'closable', false);
    const colors = useAppColors();
    const [dismissed, setDismissed] = useState(false);
    const heading = title;

    if (dismissed) return null;

    return (
        <HeroAlert status={resolved.color ?? 'default'} className={buildSectionClasses(section)}>
            <HeroAlert.Indicator />
            <HeroAlert.Content>
                {heading ? <HeroAlert.Title>{heading}</HeroAlert.Title> : null}
                {content ? <HeroAlert.Description>{content}</HeroAlert.Description> : null}
                <Children sections={(section as { children?: never }).children} values={values} />
            </HeroAlert.Content>
            {closable ? (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Dismiss"
                    onPress={() => setDismissed(true)}
                    hitSlop={8}
                    style={{ paddingHorizontal: 4, paddingVertical: 2 }}
                >
                    <View>
                        <Text style={{ fontSize: 18, lineHeight: 18, color: colors.textMuted }}>×</Text>
                    </View>
                </Pressable>
            ) : null}
        </HeroAlert>
    );
}
