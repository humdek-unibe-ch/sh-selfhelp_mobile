/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Per-form context shared between the form container and the input
 * styles inside it. Mirrors react-hook-form's `FormProvider`/`useForm`
 * but kept ultra-light because we generate field schemas dynamically
 * from the section tree.
 */

import { createContext, useContext } from 'react';

import type { IPickedFile, TPickedFiles } from '@/services/formRequests';

export interface IFormContext {
    formName: string;
    sectionId: number;
    isLog: boolean;
    isSubmitting: boolean;
    values: Record<string, unknown>;
    errors: Record<string, string | undefined>;
    setValue: (name: string, value: unknown) => void;
    /**
     * An input says which value it shows while the person has not touched it,
     * so that the form sends what the person sees (a select shows its default
     * option, a slider its minimum). Returns the function that withdraws it
     * again when the input is gone. The value is not part of `values`: an
     * untouched form is not "changed" because of it.
     */
    registerDefault: (name: string, value: string) => () => void;
    /** Files the person picked on this device, by field name; uploaded with the save. */
    files: TPickedFiles;
    /** Remember (or, with `null`, forget) the file picked for a field. */
    setFile: (name: string, file: IPickedFile | null) => void;
}

export const FormContext = createContext<IFormContext | null>(null);

export function useFormContextSafe(): IFormContext | null {
    return useContext(FormContext);
}
