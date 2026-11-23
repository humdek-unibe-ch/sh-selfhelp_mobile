/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Top-level page renderer. Iterates over `page.sections`, builds the
 * interpolation context once (page-keyword + system vars), and dispatches
 * each section through `BasicStyle`.
 */

import { useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import type { IPageContent, IPageSectionWithFields } from '@selfhelp/shared';

import { useLanguageStore } from '@/stores/languageStore';
import { BasicStyle } from './BasicStyle';
import { PageDirtyRegistryContext, VanishedSectionNotice, VanishedSectionsContext } from './VanishedSections';
import {
    createPageDirtyRegistry,
    findVanishedDirtySections,
    isUnanchored,
    keepVanished,
    placeNotices,
    type IVanishedSection,
} from './vanishedSectionLogic';

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
            // The declared route parameters of this page (`/team/{record_id}` -> { record_id: '3' }): a form list
            // repeats them in its request, because the layout of a record can read `{{route.record_id}}`.
            page_route_params: page.route_params ?? null,
        };
    }, [page.id, page.keyword, page.route_params, locale]);

    // The forms of the page report their unsaved state here. When the page is read again (a live change) and a
    // section whose form has unsaved input is gone, a notice takes its place instead of it vanishing silently.
    const [registry] = useState(createPageDirtyRegistry);
    const [seen, setSeen] = useState<{ pageId: number; sections: IPageSectionWithFields[] }>({
        pageId: page.id,
        sections: page.sections,
    });
    const [vanished, setVanished] = useState<IVanishedSection[]>([]);
    if (seen.sections !== page.sections || seen.pageId !== page.id) {
        // Adjusting state while rendering, as React documents: the forms of the old tree are still mounted here.
        if (seen.pageId !== page.id) {
            setVanished([]);
        } else {
            const added = findVanishedDirtySections(seen.sections, page.sections, registry.isDirty);
            setVanished((current) => keepVanished(current, added, page.sections));
        }
        setSeen({ pageId: page.id, sections: page.sections });
    }
    const unanchored = vanished.filter(isUnanchored);
    const anchored = vanished.filter((ghost) => !isUnanchored(ghost));

    return (
        // `handled`: a tap on a button or a list control while a keyboard is open is delivered at once
        // (it only dismisses the keyboard when it lands on nothing that handles it).
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
            <PageDirtyRegistryContext.Provider value={registry}>
                <VanishedSectionsContext.Provider value={anchored}>
                    {unanchored.map((ghost) => (
                        <VanishedSectionNotice key={`vanished-${ghost.id}`} ghost={ghost} />
                    ))}
                    {placeNotices(page.sections, anchored).map((item) =>
                        item.kind === 'section' ? (
                            <BasicStyle key={item.section.id} section={item.section} values={values} />
                        ) : (
                            <VanishedSectionNotice key={`vanished-${item.ghost.id}`} ghost={item.ghost} />
                        ),
                    )}
                </VanishedSectionsContext.Provider>
            </PageDirtyRegistryContext.Provider>
        </ScrollView>
    );
}
