/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Mobile UI adapter contract — re-exported from the SINGLE public source in
 * `@selfhelp/shared` (`IMobileUiAdapters` + the `IMobile*Props` capability
 * interfaces). Mobile rendering plan sections 8.3 / 9.2: the public app and the
 * private `@selfhelp/mobile-pro-ui` package consume ONE contract instead of
 * hand-synced copies, so they cannot silently drift.
 *
 * The renderer talks to UI primitives only through these `Mobile*` interfaces,
 * never directly to a UI library, which lets the build swap the implementation:
 *   - OSS tier -> in-repo adapters on open `heroui-native` + React Native
 *     primitives (`components/ui/adapters/oss`).
 *   - Pro tier -> the private `@selfhelp/mobile-pro-ui` package on paid HeroUI
 *     Pro components.
 *
 * Only the build-tier resolution (`TMobileUiTier` / `getMobileUiTier`) stays
 * here, because it is a mobile-app build concern, not part of the cross-repo
 * capability contract.
 */
export type {
    IMobileAdapterBaseProps,
    IMobileButtonProps,
    IMobileTextProps,
    IMobileContainerProps,
    IMobileCardProps,
    IMobileInputProps,
    IMobileTextareaProps,
    IMobileSwitchProps,
    IMobileCheckboxProps,
    IMobileSelectOption,
    IMobileSelectProps,
    IMobileModalProps,
    IMobileUiAdapters,
} from '@selfhelp/shared';

/**
 * Mobile-local extension of the switch contract: the resolved hex for the "on"
 * track, so the cross-platform `shared_color` field is honoured on mobile
 * (web gets accent colouring natively from Mantine). Declared as a module
 * augmentation to avoid editing the published `@selfhelp/shared` package from
 * the mobile repo; fold this optional field into the canonical
 * `IMobileSwitchProps` on the next `@selfhelp/shared` release.
 */
declare module '@selfhelp/shared' {
    interface IMobileSwitchProps {
        /** Resolved hex for the selected/"on" track (maps `shared_color`). */
        selectedColor?: string;
    }
}

/** Build tier identifier. */
export type TMobileUiTier = 'oss' | 'pro';

/** Resolve the active UI tier from the build environment (defaults to OSS). */
export function getMobileUiTier(): TMobileUiTier {
    const raw =
        process.env.EXPO_PUBLIC_UI_TIER ??
        process.env.SELFHELP_MOBILE_UI_TIER ??
        'oss';
    return raw === 'pro' ? 'pro' : 'oss';
}
