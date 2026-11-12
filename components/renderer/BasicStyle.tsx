/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Per-section dispatcher.
 *
 * 1. Looks up an implementation in the mobile registry by `style_name`.
 * 2. Wraps it with `DebugWrapper` (no-op outside dev/debug).
 * 3. Delegates rendering — each style component is responsible for its
 *    own children traversal (because some styles need wrapping props).
 *
 * Conditions are NOT evaluated here. The backend removes a section whose
 * condition fails for the signed-in user, so every section that arrives is
 * to be shown; evaluating the condition again on the device would use other
 * inputs (no user groups, the device clock, a locale string) and could hide
 * what the server decided to show (concept rule 4.10, finding F11).
 *
 * The registry-vs-impl map is enforced by `TStyleImplMap`, a non-`Partial`
 * `Record<TStyleRegistryKey, …>` — adding a new entry to the shared
 * `STYLE_REGISTRY` fails this compile until an impl is added below.
 */

import type { TStylePlatform } from '@selfhelp/shared';
import { getStylePluginId, isKnownStyleName, isStyleSupportedOnPlatform } from '@selfhelp/shared/registry';

import { DebugWrapper } from './DebugWrapper';
import { styleImpls } from '@/components/styles';
import { registeredPluginStyleImpls, registeredPluginStyleOwners } from '@/components/styles/registered';
import { UnknownStyle } from './UnknownStyle';
import { OpenOnWebFallback } from './OpenOnWebFallback';
import type { IStyleProps } from './types';

export function BasicStyle({ section, values }: IStyleProps): React.ReactElement | null {
    const rawName = String(section.style_name ?? '');

    // Platform targeting: silently skip styles that do not target mobile
    // (e.g. a web-only style placed on a "both" page). This is distinct
    // from the Open-on-web / UnknownStyle fallbacks below, which handle
    // styles that *could* run on mobile but have no impl in this build.
    // Prefer an explicit per-section `platform` from the backend payload;
    // otherwise fall back to the shared registry default.
    const explicitPlatform = (section as { platform?: TStylePlatform }).platform;
    const targetsMobile = explicitPlatform
        ? explicitPlatform !== 'web'
        : isStyleSupportedOnPlatform(rawName, 'mobile');
    if (!targetsMobile) return null;

    if (isKnownStyleName(rawName)) {
        const Impl = styleImpls[rawName];
        const Component = Impl ?? UnknownStyle;
        return (
            <DebugWrapper section={section}>
                <Component section={section} values={values} />
            </DebugWrapper>
        );
    }

    const PluginImpl = registeredPluginStyleImpls[rawName];
    if (PluginImpl) {
        return (
            <DebugWrapper section={section}>
                <PluginImpl section={section} values={values} />
            </DebugWrapper>
        );
    }

    const ownerPluginId = registeredPluginStyleOwners[rawName] ?? getStylePluginId(rawName);
    if (ownerPluginId) {
        return (
            <DebugWrapper section={section}>
                <OpenOnWebFallback section={section} values={values} pluginId={ownerPluginId} />
            </DebugWrapper>
        );
    }

    return (
        <DebugWrapper section={section}>
            <UnknownStyle section={section} values={values} />
        </DebugWrapper>
    );
}
