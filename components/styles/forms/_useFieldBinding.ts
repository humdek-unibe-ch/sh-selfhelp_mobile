/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Helper hook: ties a CMS form field to the surrounding form context.
 * Returns the current value, error, and a setter. Falls back to local
 * state if there's no FormProvider (e.g. an input rendered outside any
 * form-log/form-record).
 */

import { useState } from 'react';
import { useFormContextSafe } from './FormContext';

export interface IFieldBinding {
    value: string;
    error: string | undefined;
    setValue: (next: string) => void;
}

export function useFieldBinding(name: string, initial = ''): IFieldBinding {
    const ctx = useFormContextSafe();
    const [local, setLocal] = useState<string>(initial);

    if (!ctx || !name) {
        return { value: local, error: undefined, setValue: setLocal };
    }
    const fromCtx = ctx.values[name];
    return {
        value: fromCtx === undefined || fromCtx === null ? initial : String(fromCtx),
        error: ctx.errors[name],
        setValue: (next) => ctx.setValue(name, next),
    };
}
