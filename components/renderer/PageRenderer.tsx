/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Top-level page renderer. Iterates over `page.sections`, builds the
 * interpolation context once (page-keyword + system vars), and dispatches
 * each section through `BasicStyle`.
 */

import { useMemo } from 'react';
import { ScrollView } from 'react-native';
import type { IPageContent } from '@selfhelp/shared';

import { useLanguageStore } from '@/stores/languageStore';
import { BasicStyle } from './BasicStyle';

interface IPageRendererProps {
    page: IPageContent;
}

export function PageRenderer({ page }: IPageRendererProps): React.ReactElement {
    const locale = useLanguageStore((s) => s.locale);

    const values = useMemo<Record<string, unknown>>(() => {
        return {
            // `page_id` is consumed by renderers that must tell the backend which
            // CMS page they belong to (e.g. `register` posts it so the server can
            // locate the register section + open_registration policy). It is not a
            // user-facing `{{interpolation}}` token.
            page_id: page.id,
            page_keyword: page.keyword,
            language: locale ?? 'en',
        };
    }, [page.id, page.keyword, locale]);

    return (
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
            {page.sections.map((section) => (
                <BasicStyle key={section.id} section={section} values={values} />
            ))}
        </ScrollView>
    );
}
