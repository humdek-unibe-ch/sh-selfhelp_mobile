/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { MobileCard } from '@/components/ui/adapters';
import { mobileStyleProps } from '@/components/ui/mobileStyleProps';
import { buildSectionClasses } from '@/styles/sectionClasses';

/**
 * Card — renders through the swappable HeroUI Native card adapter on every
 * platform, including web. The adapter owns the themed surface (background,
 * border, elevation); the CMS radius token overrides the corner radius.
 */
export function Card({ section, values }: IStyleProps): React.ReactElement {
    const resolved = mobileStyleProps(section);

    return (
        <MobileCard radiusPx={resolved.radiusPx} className={buildSectionClasses(section)}>
            <Children sections={(section as { children?: never }).children} values={values} />
        </MobileCard>
    );
}
