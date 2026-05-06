import { Pressable, Text, View } from 'react-native';

interface IErrorScreenProps {
    title?: string;
    message?: string;
    onRetry?: () => void;
    actionLabel?: string;
    onAction?: () => void;
}

export function ErrorScreen({
    title = 'Something went wrong',
    message,
    onRetry,
    actionLabel,
    onAction,
}: IErrorScreenProps): React.ReactElement {
    return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>{title}</Text>
            {message ? (
                <Text style={{ color: '#666', textAlign: 'center', marginBottom: 16 }}>{message}</Text>
            ) : null}
            {onRetry ? (
                <Pressable
                    onPress={onRetry}
                    style={{ paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#228be6', borderRadius: 4, marginBottom: 8 }}
                >
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Retry</Text>
                </Pressable>
            ) : null}
            {onAction ? (
                <Pressable
                    onPress={onAction}
                    style={{ paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#495057', borderRadius: 4 }}
                >
                    <Text style={{ color: '#fff', fontWeight: '600' }}>{actionLabel ?? 'Continue'}</Text>
                </Pressable>
            ) : null}
        </View>
    );
}
