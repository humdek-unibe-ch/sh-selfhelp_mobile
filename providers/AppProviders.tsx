/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Composes every root provider in the right order:
 *
 *   ErrorBoundary
 *     └─ ServerProvider                (sets baseURL)
 *        └─ QueryProvider              (TanStack Query)
 *           └─ I18nProvider            (i18next, depends on QueryClient)
 *              └─ ThemeProvider        (HeroUI Native)
 *                 └─ AuthProvider      (refresh-token bootstrap)
 *                    └─ SessionSyncProvider
 *                       └─ children    (router)
 */

import { type ReactNode } from 'react';

import { AuthProvider } from './AuthProvider';
import { ErrorBoundary } from './ErrorBoundary';
import { I18nProvider } from './I18nProvider';
import { NativeBootstrap } from './NativeBootstrap';
import { QueryProvider } from './QueryProvider';
import { SessionSyncProvider } from './SessionSyncProvider';
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
                                <SessionSyncProvider>
                                    <NativeBootstrap />
                                    {children}
                                </SessionSyncProvider>
                            </AuthProvider>
                        </ThemeProvider>
                    </I18nProvider>
                </QueryProvider>
            </ServerProvider>
        </ErrorBoundary>
    );
}
