/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import type { IBaseStyle, IPageSectionWithFields, TStyle } from '@selfhelp/shared';
import type { TStyleRegistryKey } from '@selfhelp/shared/registry';

export type TSectionLike = IPageSectionWithFields | (TStyle & Partial<IBaseStyle>);

export interface IStyleProps {
    section: TSectionLike;
    /**
     * Resolved value map for `{{field}}` interpolation. Pre-populated by
     * `PageRenderer` from the page content + system variables. Style
     * components read it via `useInterpolation()`.
     */
    values: Record<string, unknown>;
}

export type TStyleComponent = React.ComponentType<IStyleProps>;

/**
 * Core implementation map: keys come straight from the shared
 * `STYLE_REGISTRY`. The map is **non-Partial** — TypeScript fails the
 * build if a registered core style is missing or an extra one is added.
 * Add the registry entry in
 * `sh-selfhelp_shared/src/registry/styles.registry.ts` first, then
 * implement here.
 */
export type TStyleImplMap = Record<TStyleRegistryKey, TStyleComponent>;

/**
 * Plugin-contributed implementation map. Keys are plugin style names;
 * they're open-ended at type level so plugin packages can ship
 * additional entries without touching the core map. Populated through
 * `components/styles/registered.ts` (auto-generated per EAS profile by
 * `scripts/plugins-sync.mjs`).
 *
 * Plugin styles registered on the backend but missing from this map
 * are dispatched to `OpenOnWebFallback`, which renders an "Open on
 * web" prompt so the page keeps rendering.
 */
export type TPluginStyleImplMap = Record<string, TStyleComponent>;
