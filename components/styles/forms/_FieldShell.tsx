/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { useAppColors } from '@/hooks/useAppColors';

interface IFieldShellProps {
    label?: string;
    description?: string;
    error?: string;
    required?: boolean;
    children: ReactNode;
    className?: string;
}

/**
 * Shared chrome for every form field: label + description + slot + error
 * line. Every form-style component wraps its concrete control with this.
 */
export function FieldShell({ label, description, error, required, children, className }: IFieldShellProps): React.ReactElement {
    const colors = useAppColors();
    return (
        <View className={className} style={{ marginVertical: 6 }}>
            {label ? (
                <Text style={{ fontWeight: '600', marginBottom: 4, color: colors.text }}>
                    {label}
                    {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
                </Text>
            ) : null}
            {description ? (
                <Text style={{ color: colors.textFaint, fontSize: 12, marginBottom: 6 }}>{description}</Text>
            ) : null}
            {children}
            {error ? <Text style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>{error}</Text> : null}
        </View>
    );
}
