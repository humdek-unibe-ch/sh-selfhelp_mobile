import { Text, View } from 'react-native';
import type { ReactNode } from 'react';

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
    return (
        <View className={className} style={{ marginVertical: 6 }}>
            {label ? (
                <Text style={{ fontWeight: '600', marginBottom: 4 }}>
                    {label}
                    {required ? <Text style={{ color: '#fa5252' }}> *</Text> : null}
                </Text>
            ) : null}
            {description ? (
                <Text style={{ color: '#868e96', fontSize: 12, marginBottom: 6 }}>{description}</Text>
            ) : null}
            {children}
            {error ? <Text style={{ color: '#fa5252', fontSize: 12, marginTop: 4 }}>{error}</Text> : null}
        </View>
    );
}
