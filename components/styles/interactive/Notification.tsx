/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { useState } from 'react';
import { Alert, CloseButton } from 'heroui-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { useInterpolatedField, readField, readBooleanField } from '@/components/renderer/useField';
import { mobileStyleProps } from '@/components/ui/mobileStyleProps';

type TAlertStatus = 'default' | 'accent' | 'success' | 'warning' | 'danger';

/**
 * Map a Mantine palette colour (the portable `color`) to the closest
 * HeroUI Native Alert status. HeroUI Alert is status-driven (5 semantic colours)
 * rather than free-palette, so the mobile render is a documented approximation of
 * the exact web colour.
 */
function colorToStatus(color?: string): TAlertStatus {
    switch ((color ?? '').toLowerCase()) {
        case 'green':
        case 'teal':
        case 'lime':
            return 'success';
        case 'red':
        case 'pink':
            return 'danger';
        case 'yellow':
        case 'orange':
            return 'warning';
        case 'gray':
        case 'grey':
        case '':
            return 'default';
        default:
            return 'accent';
    }
}

/**
 * notification — rendered HeroUI-Native-first via `Alert` (status icon + theme
 * colours) with an optional `CloseButton`. Portable fields:
 *   - `color`   -> Alert `status` (mapped to the nearest semantic colour)
 *   - `shared_icon`    -> shows the status `Alert.Indicator` when set (mobile has
 *                         no icon-font, so the exact web glyph is approximated by
 *                         the status icon — documented platform remap)
 *   - `with_close_button` -> renders a dismissible `CloseButton`
 */
export function Notification({ section, values }: IStyleProps): React.ReactElement | null {
    const [visible, setVisible] = useState(true);
    const title = useInterpolatedField(section, 'title', values);
    const content = useInterpolatedField(section, 'content', values);
    const status = colorToStatus(readField<string>(section, 'color'));
    const hasIcon = Boolean(readField<string>(section, 'shared_icon'));
    const withClose = readBooleanField(section, 'with_close_button', false);
    const resolved = mobileStyleProps(section);

    if (!visible) {
        return null;
    }

    return (
        <Alert
            status={status}
            className={buildSectionClasses(section)}
            style={resolved.radiusPx !== undefined ? { borderRadius: resolved.radiusPx } : undefined}
        >
            {hasIcon ? <Alert.Indicator /> : null}
            <Alert.Content>
                {title ? <Alert.Title>{title}</Alert.Title> : null}
                {content ? <Alert.Description>{content}</Alert.Description> : null}
            </Alert.Content>
            {withClose ? <CloseButton onPress={() => setVisible(false)} /> : null}
        </Alert>
    );
}
