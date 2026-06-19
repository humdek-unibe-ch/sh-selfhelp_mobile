/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Card } from 'heroui-native';
import type { IMobileCardProps } from '../types';

/**
 * OSS MobileCard — real HeroUI Native `Card` (compound `Card`/`Card.Body`).
 * Children render inside `Card.Body` so they get HeroUI's surface padding and
 * theming. `radiusPx` (from the shared radius token) overrides the themed
 * corner radius when the CMS sets it. Pro swaps in a polished HeroUI Pro card.
 */
export function MobileCard({
    children,
    radiusPx,
    className,
    accessibilityLabel,
    testID,
}: IMobileCardProps): React.ReactElement {
    return (
        <Card
            className={className || undefined}
            style={radiusPx !== undefined ? { borderRadius: radiusPx } : undefined}
            accessibilityLabel={accessibilityLabel}
            testID={testID}
        >
            <Card.Body>{children}</Card.Body>
        </Card>
    );
}
