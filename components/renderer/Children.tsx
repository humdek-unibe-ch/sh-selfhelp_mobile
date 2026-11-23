/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Helper used by container styles to render their children. Always
 * routes through `BasicStyle` so platform targeting + debug + registry
 * lookup apply uniformly.
 */

import type { IPageSectionWithFields } from '@selfhelp/shared';

import { BasicStyle } from './BasicStyle';
import { useVanishedSections, VanishedSectionNotice } from './VanishedSections';
import { placeNotices } from './vanishedSectionLogic';

interface IChildrenProps {
    sections?: IPageSectionWithFields[];
    values: Record<string, unknown>;
}

export function Children({ sections, values }: IChildrenProps): React.ReactElement | null {
    // A section removed while its form had unsaved input leaves a notice where it was (live sync).
    const vanished = useVanishedSections();
    if (!sections?.length) return null;
    return (
        <>
            {placeNotices(sections, vanished).map((item) =>
                item.kind === 'section' ? (
                    <BasicStyle key={item.section.id} section={item.section} values={values} />
                ) : (
                    <VanishedSectionNotice key={`vanished-${item.ghost.id}`} ghost={item.ghost} />
                ),
            )}
        </>
    );
}
