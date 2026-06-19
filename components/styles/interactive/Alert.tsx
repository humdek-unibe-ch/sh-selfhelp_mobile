/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Alert as HeroAlert } from 'heroui-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { useInterpolatedField } from '@/components/renderer/useField';
import { mobileStyleProps } from '@/components/ui/mobileStyleProps';

/**
 * Alert — renders the HeroUI Native `Alert` compound (status indicator + title +
 * description) on every platform, including web. The status/color comes from the
 * shared `intent` field via the shared mapper (HeroUI status vocabulary matches
 * `accent|default|success|warning|danger`).
 */
export function Alert({ section, values }: IStyleProps): React.ReactElement {
    const title = useInterpolatedField(section, 'alert_title', values);
    const content = useInterpolatedField(section, 'content', values);
    const resolved = mobileStyleProps(section);
    const heading = title;

    return (
        <HeroAlert status={resolved.color ?? 'default'} className={buildSectionClasses(section)}>
            <HeroAlert.Indicator />
            <HeroAlert.Content>
                {heading ? <HeroAlert.Title>{heading}</HeroAlert.Title> : null}
                {content ? <HeroAlert.Description>{content}</HeroAlert.Description> : null}
                <Children sections={(section as { children?: never }).children} values={values} />
            </HeroAlert.Content>
        </HeroAlert>
    );
}
