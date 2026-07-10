/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Local prop / state types for the FormUserInput style. The runtime
 * context shape lives in `../FormContext.ts` because it's also imported
 * by every form input style.
 */

import type { IStyleProps } from '@/components/renderer/types';

export interface IFormBaseProps extends IStyleProps {
    /** True for `form-log` (append-only), false for record forms. */
    isLog: boolean;
}
