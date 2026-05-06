/**
 * Mobile renderer DebugWrapper.
 *
 * In development AND when the section opts in (`debug=1` field), wraps
 * the rendered output with a thin red dashed border, a label showing
 * `style_name #id (section_name)`, and a small footer that surfaces:
 *   - the condition expression and whether it passed,
 *   - the applied `css_mobile` class string (post `cssMobileToUniwind`).
 *
 * Production renders the children straight through.
 */

import { Text, View } from 'react-native';
import type { ReactNode } from 'react';

import { cssMobileToUniwind } from '@/styles/cssMobileToUniwind';
import type { TSectionLike } from './types';

export interface IConditionOutcome {
    visible: boolean;
    condition: string | null;
}

interface IDebugWrapperProps {
    section: TSectionLike;
    children: ReactNode;
    conditionOutcome?: IConditionOutcome;
}

export function DebugWrapper({ section, children, conditionOutcome }: IDebugWrapperProps): React.ReactElement {
    const debugFlag = (section as { debug?: number | null }).debug;
    if (!__DEV__ || debugFlag !== 1) return <>{children}</>;

    const cssMobile = (section as { css_mobile?: string | null }).css_mobile;
    const appliedClasses = cssMobileToUniwind(cssMobile ?? null);

    return (
        <View
            style={{
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: '#fa5252',
                padding: 4,
                marginVertical: 2,
            }}
        >
            <Text style={{ fontSize: 10, color: '#fa5252', marginBottom: 2 }}>
                {section.style_name} #{section.id} ({section.section_name})
            </Text>
            {children}
            <View style={{ marginTop: 4, padding: 4, backgroundColor: '#fff5f5', borderRadius: 2 }}>
                {conditionOutcome?.condition ? (
                    <Text style={{ fontSize: 9, color: '#495057' }}>
                        cond: {conditionOutcome.visible ? 'PASS' : 'FAIL'} — {conditionOutcome.condition.slice(0, 80)}
                    </Text>
                ) : null}
                {appliedClasses ? (
                    <Text style={{ fontSize: 9, color: '#495057' }} numberOfLines={2}>
                        css_mobile: {appliedClasses}
                    </Text>
                ) : null}
            </View>
        </View>
    );
}
