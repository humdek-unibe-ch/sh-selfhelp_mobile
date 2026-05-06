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
 * Implementation map: keys come straight from the shared `STYLE_REGISTRY`.
 * The map is **non-Partial** — TypeScript fails the build if a registered
 * style is missing or an extra one is added. Add the registry entry in
 * `sh-selfhelp_shared/src/registry/styles.registry.ts` first, then
 * implement here.
 */
export type TStyleImplMap = Record<TStyleRegistryKey, TStyleComponent>;
