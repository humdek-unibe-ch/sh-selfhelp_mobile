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

import { useEffect, useState } from 'react';
import { useFormContextSafe } from './FormContext';

export interface IFieldBinding {
    value: string;
    error: string | undefined;
    setValue: (next: string) => void;
}

export interface IFieldBindingOptions {
    /**
     * Whether the value the input shows before it is touched is also what the
     * form sends for it (the default). A file input sends a file, not text.
     */
    sendDefault?: boolean;
}

export function useFieldBinding(name: string, initial = '', options: IFieldBindingOptions = {}): IFieldBinding {
    const ctx = useFormContextSafe();
    const [local, setLocal] = useState<string>(initial);
    const registerDefault = ctx?.registerDefault;
    const sendDefault = options.sendDefault !== false;

    // What an input shows before it is touched is what the form sends for it,
    // the way a browser form sends the value of every field it holds.
    useEffect(() => {
        if (!registerDefault || !sendDefault || !name) {
            return undefined;
        }
        return registerDefault(name, initial);
    }, [registerDefault, sendDefault, name, initial]);

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
