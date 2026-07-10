/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Page navigation icon.
 *
 * Draws a page's curated `mobile_icon` (a lucide PascalCase name from the
 * shared `MOBILE_ICON_SET`) with `lucide-react-native`. When a page has no
 * `mobile_icon` — or an unknown value — we fall back to the single-character
 * glyph hint (`iconForPage`) so every menu entry still shows something.
 *
 * The lucide components live in the shared `GLYPH_ICONS` registry
 * (`components/ui/glyphIcon.tsx`), statically imported so Metro only bundles
 * what we use. Every `MOBILE_ICON_SET` name in `@selfhelp/shared` must exist
 * there (the admin picker and the renderer can never drift).
 */

import { Text } from 'react-native';
import type { IPageItem } from '@selfhelp/shared';
import { isMobileIconName } from '@selfhelp/shared';
import { Circle } from 'lucide-react-native';
import { GLYPH_ICONS } from '@/components/ui/glyphIcon';

import { iconForPage } from './navigationUtils';

interface IPageMenuIconProps {
    page: IPageItem;
    size?: number;
    color?: string;
}

export function PageMenuIcon({ page, size = 22, color }: IPageMenuIconProps): React.ReactElement {
    if (isMobileIconName(page.mobile_icon)) {
        const Cmp = GLYPH_ICONS[page.mobile_icon] ?? Circle;
        return <Cmp size={size} color={color} />;
    }

    return (
        <Text
            style={{
                width: size,
                textAlign: 'center',
                color,
                fontWeight: '700',
                fontSize: Math.round(size * 0.7),
            }}
        >
            {iconForPage(page)}
        </Text>
    );
}
