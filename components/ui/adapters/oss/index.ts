/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * OSS tier adapter set. This module is what the `@selfhelp/mobile-pro-ui`
 * specifier resolves to in the default (OSS) build — see the tsconfig
 * `paths` alias and the Metro `extraNodeModules` alias in `metro.config.js`.
 * Pro builds point that same specifier at the private package instead.
 */
import { MobileButton } from './MobileButton';
import { MobileText } from './MobileText';
import { MobileContainer } from './MobileContainer';
import { MobileCard } from './MobileCard';
import { MobileInput } from './MobileInput';
import { MobileTextarea } from './MobileTextarea';
import { MobileSwitch } from './MobileSwitch';
import { MobileCheckbox } from './MobileCheckbox';
import { MobileSelect } from './MobileSelect';
import { MobileModal } from './MobileModal';
import type { IMobileUiAdapters } from '../types';

export * from '../types';
export { MobileButton } from './MobileButton';
export { MobileText } from './MobileText';
export { MobileContainer } from './MobileContainer';
export { MobileCard } from './MobileCard';
export { MobileInput } from './MobileInput';
export { MobileTextarea } from './MobileTextarea';
export { MobileSwitch } from './MobileSwitch';
export { MobileCheckbox } from './MobileCheckbox';
export { MobileSelect } from './MobileSelect';
export { MobileModal } from './MobileModal';

/** Bundled OSS adapter set, satisfying the shared adapter contract. */
export const ossAdapters: IMobileUiAdapters = {
    MobileButton,
    MobileText,
    MobileContainer,
    MobileCard,
    MobileInput,
    MobileTextarea,
    MobileSwitch,
    MobileCheckbox,
    MobileSelect,
    MobileModal,
};

/**
 * The OSS tier contributes no Pro overrides — its base set is complete. This
 * export exists so the active seam (`adapters/index.ts`) can compose
 * `ossAdapters + proOverrides` uniformly: in an OSS build the
 * `@selfhelp/mobile-pro-ui` specifier resolves here, yielding an empty override
 * set (pure OSS); in a Pro build it resolves to the private package's overrides.
 */
export const proOverrides: Partial<IMobileUiAdapters> = {};
