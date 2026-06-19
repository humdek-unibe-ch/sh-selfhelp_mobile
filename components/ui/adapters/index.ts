/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Active mobile UI adapter seam — the single import site for style components
 * (`import { MobileButton } from '@/components/ui/adapters'`).
 *
 * The active set is composed per capability (mobile rendering plan, section 9.2):
 *
 *   effective adapter = open-source base + available Pro overrides
 *
 * The open-source base (`./oss`) is always present. The `@selfhelp/mobile-pro-ui`
 * specifier is resolved at build time:
 *   - OSS tier (default): -> `components/ui/adapters/oss` (its `proOverrides` is
 *     empty, so the active set is pure OSS).
 *   - Pro tier: -> the private `@selfhelp/mobile-pro-ui` package, whose
 *     `proOverrides` replaces only the capabilities it improves; every other
 *     capability keeps its open-source fallback.
 *
 * The alias is configured in `tsconfig.json` (OSS) / `tsconfig.pro.json` (Pro)
 * for type-checking and `metro.config.js` (`resolver.extraNodeModules`) for the
 * bundler, driven by `SELFHELP_MOBILE_UI_TIER` / `SELFHELP_MOBILE_PRO_UI_PATH`.
 * No app code changes are needed to switch tiers.
 */
// The OSS base is always `./oss`; the Pro overrides come from the build-time
// swappable `@selfhelp/mobile-pro-ui` specifier. In the OSS tier that specifier
// aliases to `./oss` too (its `proOverrides` is empty), which is why the import
// resolver sees a "duplicate" here — the two sources are intentionally distinct
// and diverge in the Pro tier (where the specifier resolves to the private
// package), so they cannot be merged into one import.
/* eslint-disable import/no-duplicates */
import { ossAdapters } from './oss';
import { proOverrides } from '@selfhelp/mobile-pro-ui';
/* eslint-enable import/no-duplicates */
import { composeMobileAdapters } from './compose';

export * from './types';
export { composeMobileAdapters, ossAdapters };

/** Active adapter set = OSS base composed with the available Pro overrides. */
export const adapters = composeMobileAdapters(ossAdapters, proOverrides);

export const MobileButton = adapters.MobileButton;
export const MobileText = adapters.MobileText;
export const MobileContainer = adapters.MobileContainer;
export const MobileCard = adapters.MobileCard;
export const MobileInput = adapters.MobileInput;
export const MobileTextarea = adapters.MobileTextarea;
export const MobileSwitch = adapters.MobileSwitch;
export const MobileCheckbox = adapters.MobileCheckbox;
export const MobileSelect = adapters.MobileSelect;
export const MobileModal = adapters.MobileModal;
