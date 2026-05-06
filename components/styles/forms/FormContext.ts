/**
 * Per-form context shared between the form container and the input
 * styles inside it. Mirrors react-hook-form's `FormProvider`/`useForm`
 * but kept ultra-light because we generate field schemas dynamically
 * from the section tree.
 */

import { createContext, useContext } from 'react';

export interface IFormContext {
    formName: string;
    sectionId: number;
    isLog: boolean;
    isSubmitting: boolean;
    values: Record<string, unknown>;
    errors: Record<string, string | undefined>;
    setValue: (name: string, value: unknown) => void;
}

export const FormContext = createContext<IFormContext | null>(null);

export function useFormContextSafe(): IFormContext | null {
    return useContext(FormContext);
}
