/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Dialog } from 'heroui-native';
import type { IMobileModalProps } from '../types';

/**
 * OSS MobileModal — real HeroUI Native `Dialog` compound (Portal / Overlay /
 * Content / Title). Controlled through `isOpen` + `onOpenChange`; pressing the
 * overlay or swiping closes it, which we forward to `onClose`. The Dialog
 * renders into the portal host mounted by `HeroUINativeProvider`, which is now
 * present on web too, so this works on every platform. Pro swaps in the HeroUI
 * Pro dialog / bottom-sheet.
 */
export function MobileModal({
    isOpen,
    onClose,
    title,
    children,
    className,
    accessibilityLabel,
    testID,
}: IMobileModalProps): React.ReactElement {
    return (
        <Dialog
            isOpen={isOpen}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <Dialog.Portal>
                <Dialog.Overlay />
                <Dialog.Content
                    className={className || undefined}
                    accessibilityLabel={accessibilityLabel ?? title}
                    testID={testID}
                >
                    {title ? <Dialog.Title>{title}</Dialog.Title> : null}
                    {children}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog>
    );
}
