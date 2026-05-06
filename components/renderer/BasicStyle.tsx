/**
 * Per-section dispatcher.
 *
 * 1. Looks up an implementation in the mobile registry by `style_name`.
 * 2. Wraps it with `DebugWrapper` (no-op outside dev/debug).
 * 3. Delegates rendering — each style component is responsible for its
 *    own children traversal (because some styles need wrapping props).
 *
 * The registry-vs-impl map is enforced by `TStyleImplMap`, a non-`Partial`
 * `Record<TStyleRegistryKey, …>` — adding a new entry to the shared
 * `STYLE_REGISTRY` fails this compile until an impl is added below.
 */

import { useMemo } from 'react';

import { evaluateCondition, buildConditionContext } from '@selfhelp/shared';
import type { TPlatform } from '@selfhelp/shared';
import type { TStyleRegistryKey } from '@selfhelp/shared/registry';

import { DebugWrapper } from './DebugWrapper';
import { styleImpls } from '@/components/styles';
import { UnknownStyle } from './UnknownStyle';
import type { IStyleProps } from './types';

const PLATFORM: TPlatform = 'mobile';

export function BasicStyle({ section, values }: IStyleProps): React.ReactElement | null {
    const conditionOutcome = useMemo(() => {
        const condition = (section as { condition?: string | null }).condition;
        if (!condition) return { visible: true, condition: null as string | null };
        const ctx = buildConditionContext(PLATFORM, values);
        return { visible: evaluateCondition(condition, ctx).visible, condition };
    }, [section, values]);

    if (!conditionOutcome.visible) return null;

    const styleName = section.style_name as TStyleRegistryKey;
    const Impl = styleImpls[styleName];
    const Component = Impl ?? UnknownStyle;

    return (
        <DebugWrapper section={section} conditionOutcome={conditionOutcome}>
            <Component section={section} values={values} />
        </DebugWrapper>
    );
}
