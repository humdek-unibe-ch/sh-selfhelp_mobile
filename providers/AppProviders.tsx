/**
 * Composes every root provider in the right order:
 *
 *   ErrorBoundary
 *     └─ ServerProvider                (sets baseURL)
 *        └─ QueryProvider              (TanStack Query)
 *           └─ I18nProvider            (i18next, depends on QueryClient)
 *              └─ ThemeProvider        (HeroUI Native)
 *                 └─ AuthProvider      (refresh-token bootstrap)
 *                    └─ children       (router)
 */

import { type ReactNode } from 'react';

import { AuthProvider } from './AuthProvider';
import { ErrorBoundary } from './ErrorBoundary';
import { I18nProvider } from './I18nProvider';
import { NativeBootstrap } from './NativeBootstrap';
import { QueryProvider } from './QueryProvider';
import { ServerProvider } from './ServerProvider';
import { ThemeProvider } from './ThemeProvider';

interface IAppProvidersProps {
    children: ReactNode;
}

export function AppProviders({ children }: IAppProvidersProps): ReactNode {
    return (
        <ErrorBoundary>
            <ServerProvider>
                <QueryProvider>
                    <I18nProvider>
                        <ThemeProvider>
                            <AuthProvider>
                                <NativeBootstrap />
                                {children}
                            </AuthProvider>
                        </ThemeProvider>
                    </I18nProvider>
                </QueryProvider>
            </ServerProvider>
        </ErrorBoundary>
    );
}
