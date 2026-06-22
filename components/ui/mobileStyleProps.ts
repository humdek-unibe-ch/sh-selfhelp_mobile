/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Reads the renderer-agnostic shared style fields (`shared_*`) plus any
 * `mobile_*` overrides off a CMS section and resolves them, through the shared
 * semantic mapper in `@selfhelp/shared`, into normalized HeroUI Native adapter
 * props.
 *
 * Field reading delegates to the shared `resolveSharedStyleProps`, the single
 * source of truth for the `shared_*` field names and their narrowed domains
 * (`size` = sm|md|lg, `radius` = none|sm|md|lg|full). Per the
 * mobile rendering plan (section 6.3) the mobile renderer NEVER reads `web_*`
 * fields — there is no web->mobile fallback. The only mobile-local mapping is
 * the documented `mobile_variant` override.
 */
import {
    resolveMantineVariant,
    resolveSharedStyleProps,
    toHeroUiSemanticProps,
    type IHeroUiResolvedStyle,
    type ISharedStyleProps,
    type THeroUiButtonVariant,
    type TSemanticState,
} from '@selfhelp/shared';
import type { TSectionLike } from '@/components/renderer/types';
import { readBooleanField, readField } from '@/components/renderer/useField';

const BUTTON_VARIANTS = new Set<THeroUiButtonVariant>([
    'primary', 'secondary', 'tertiary', 'outline', 'ghost', 'danger', 'danger-soft',
]);

function pick<T>(value: string | undefined, allowed: Set<T>): T | undefined {
    return value !== undefined && allowed.has(value as T) ? (value as T) : undefined;
}

/** Flatten the `shared_*` fields the shared resolver reads off a section. */
function sharedFieldRecord(section: TSectionLike): Record<string, unknown> {
    return {
        size: readField(section, 'size'),
        radius: readField(section, 'radius'),
        // The REAL cross-platform appearance fields (Mantine palette/variant the
        // web renderer reads too). `shared_intent` is kept for back-compat only —
        // it is not in the live catalog.
        color: readField(section, 'color'),
        variant: readField(section, 'variant'),
        shared_intent: readField(section, 'shared_intent'),
        full_width: readField(section, 'full_width'),
    };
}

/**
 * Read the shared semantic props (size/radius/intent/fullWidth resolved by the
 * shared mapper) plus the unprefixed boolean state fields. No `web_*` fallback.
 */
export function readSharedStyleProps(section: TSectionLike): ISharedStyleProps {
    const base = resolveSharedStyleProps(sharedFieldRecord(section));

    const states: TSemanticState[] = [];
    if (readBooleanField(section, 'disabled', false)) states.push('disabled');
    if (readBooleanField(section, 'loading', false)) states.push('loading');
    if (readBooleanField(section, 'invalid', false)) states.push('invalid');
    if (readBooleanField(section, 'required', false)) states.push('required');

    return { ...base, states };
}

/**
 * Resolve a section's shared + `mobile_*` fields into normalized HeroUI Native
 * adapter props. `mobile_variant` overrides the intent-derived button variant
 * when a designer needs a HeroUI-specific look.
 */
export function mobileStyleProps(section: TSectionLike): IHeroUiResolvedStyle {
    const resolved = toHeroUiSemanticProps(readSharedStyleProps(section));

    const mobileVariant = pick(readField<string>(section, 'mobile_variant'), BUTTON_VARIANTS);
    if (mobileVariant) {
        resolved.buttonVariant = mobileVariant;
    }

    return resolved;
}

/**
 * Clean-RN palette for components HeroUI Native does not ship (badge, alert
 * surface on web preview, etc.). The colour comes from the REAL cross-platform
 * fields the CMS stores — `color` (a Mantine palette value) and
 * `variant` (a Mantine variant) — fed straight into the shared Mantine
 * variant resolver, exactly like the web renderer. The mobile renderer never
 * reads `web_*` (plan section 6.3); `shared_intent` is not in the catalog.
 * `defaultVariant` is the caller's fallback when no `variant` is authored.
 */
export function mobileIntentPalette(
    section: TSectionLike,
    defaultVariant = 'light',
): { palette: ReturnType<typeof resolveMantineVariant>; variant: string; colorName: string } {
    const { color, variant } = readSharedStyleProps(section);
    const colorName = color ?? 'gray';
    const effectiveVariant = variant ?? defaultVariant;
    return {
        palette: resolveMantineVariant(effectiveVariant, colorName),
        variant: effectiveVariant,
        colorName,
    };
}
