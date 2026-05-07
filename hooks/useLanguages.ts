/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { fetchLanguages } from '@/services/languageService';
import { useLanguageStore } from '@/stores/languageStore';
import { useServerStore } from '@/stores/serverStore';

export function useLanguages() {
    const serverUrl = useServerStore((s) => s.serverUrl);

    const query = useQuery({
        queryKey: ['languages', serverUrl],
        queryFn: fetchLanguages,
        enabled: Boolean(serverUrl),
        staleTime: 1000 * 60 * 60,
    });

    useEffect(() => {
        if (query.data) {
            useLanguageStore.getState().setAvailable(query.data);
        }
    }, [query.data]);

    return query;
}
