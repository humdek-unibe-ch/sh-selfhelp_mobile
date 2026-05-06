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
            page_keyword: page.keyword,
            language: locale ?? 'en',
        };
    }, [page.keyword, locale]);

    return (
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
            {page.sections.map((section) => (
                <BasicStyle key={section.id} section={section} values={values} />
            ))}
        </ScrollView>
    );
}
