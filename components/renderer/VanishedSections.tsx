/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * React side of the "a section vanished while its form was dirty" notice (`vanishedSectionLogic.ts` holds the
 * logic): the registry the forms of the page report their unsaved state to, and the notices the page draws in
 * place of the sections that disappeared.
 */
import { createContext, useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { PageNotice } from '@/components/feedback/PageNotice';

import type { IPageDirtyRegistry, IVanishedSection } from './vanishedSectionLogic';

export const PageDirtyRegistryContext = createContext<IPageDirtyRegistry | null>(null);
export const VanishedSectionsContext = createContext<readonly IVanishedSection[]>([]);

/** Tell the page whether this form has unsaved input, so it can say so when the section is removed. */
export function useRegisterDirtySection(sectionId: number, isDirty: () => boolean): void {
    const registry = useContext(PageDirtyRegistryContext);
    useEffect(() => registry?.register(sectionId, isDirty), [registry, sectionId, isDirty]);
}

export function useVanishedSections(): readonly IVanishedSection[] {
    return useContext(VanishedSectionsContext);
}

/** The notice drawn where a section with unsaved input was removed. */
export function VanishedSectionNotice({ ghost }: { ghost: IVanishedSection }): React.ReactElement {
    const { t } = useTranslation();
    return (
        <PageNotice
            testID={`vanished-section-${ghost.id}`}
            title={t('page.sectionRemoved.title', 'A part of this page was removed')}
            message={t(
                'page.sectionRemoved.message',
                'A form you were filling in is no longer part of this page. What you entered there was not saved.',
            )}
        />
    );
}
