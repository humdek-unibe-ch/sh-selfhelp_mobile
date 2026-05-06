/**
 * Top-level error boundary. Catches render-time errors anywhere in the
 * tree and shows a fallback. Uncaught promise rejections still surface
 * via Expo's red box in dev — this only handles render exceptions.
 */

import { Component, type ReactNode } from 'react';
import { Text, View } from 'react-native';

interface IErrorBoundaryProps {
    children: ReactNode;
    fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface IErrorBoundaryState {
    error: Error | null;
}

export class ErrorBoundary extends Component<IErrorBoundaryProps, IErrorBoundaryState> {
    constructor(props: IErrorBoundaryProps) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error: Error): IErrorBoundaryState {
        return { error };
    }

    override componentDidCatch(error: Error): void {
        if (typeof console !== 'undefined') {
            // eslint-disable-next-line no-console
            console.error('[ErrorBoundary]', error);
        }
    }

    private reset = (): void => this.setState({ error: null });

    override render(): ReactNode {
        if (this.state.error) {
            if (this.props.fallback) return this.props.fallback(this.state.error, this.reset);
            return (
                <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>Something went wrong</Text>
                    <Text style={{ color: '#666' }}>{this.state.error.message}</Text>
                </View>
            );
        }
        return this.props.children;
    }
}
