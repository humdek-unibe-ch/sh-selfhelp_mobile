/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Helper used by container styles to render their children. Always
 * routes through `BasicStyle` so condition + debug + registry lookup
 * apply uniformly.
 */

import type { IPageSectionWithFields } from '@selfhelp/shared';

import { BasicStyle } from './BasicStyle';

interface IChildrenProps {
    sections?: IPageSectionWithFields[];
    values: Record<string, unknown>;
}

export function Children({ sections, values }: IChildrenProps): React.ReactElement | null {
    if (!sections?.length) return null;
    return (
        <>
            {sections.map((child) => (
                <BasicStyle key={child.id} section={child} values={values} />
            ))}
        </>
    );
}
