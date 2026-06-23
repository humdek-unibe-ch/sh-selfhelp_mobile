/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Hooks for the FormUserInput style: state + submit handler.
 *
 * `react-hook-form` is intentionally NOT used here — the schema is
 * dynamic, the children come from the CMS, and the field-set may
 * change at any time. Hand-rolling the bookkeeping is cheaper than
 * adapting RHF's registration flow to a CMS-driven form.
 */

import { useCallback, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import type { IFormContext } from '../FormContext';
import { submitForm, updateForm, type TFormResult } from '@/services/formsService';

interface IUseFormControllerArgs {
    sectionId: number;
    /** CMS page the form lives on. The backend requires it to run the page-access check. */
    pageId: number;
    formName: string;
    isLog: boolean;
    successMessage?: string | null;
    errorMessage?: string | null;
    cancelUrl?: string | null;
    ajax: boolean;
}

export function useFormController(args: IUseFormControllerArgs): {
    ctx: IFormContext;
    isSubmitting: boolean;
    resultMessage: string | null;
    resultIsError: boolean;
    onSubmit: () => Promise<void>;
    onCancel: () => void;
} {
    const { sectionId, pageId, formName, isLog, successMessage, errorMessage, cancelUrl, ajax } = args;

    const queryClient = useQueryClient();
    const [formValues, setFormValues] = useState<Record<string, unknown>>({});
    const [errors, setErrors] = useState<Record<string, string | undefined>>({});
    const [isSubmitting, setSubmitting] = useState(false);
    const [resultMessage, setResultMessage] = useState<string | null>(null);
    const [resultIsError, setResultIsError] = useState(false);

    const ctx = useMemo<IFormContext>(
        () => ({
            formName,
            sectionId,
            isLog,
            isSubmitting,
            values: formValues,
            errors,
            setValue: (name, value) => setFormValues((prev) => ({ ...prev, [name]: value })),
        }),
        [errors, formName, formValues, isLog, isSubmitting, sectionId]
    );

    const onSubmit = useCallback(async (): Promise<void> => {
        setSubmitting(true);
        setResultMessage(null);
        setErrors({});

        const action = isLog ? submitForm : updateForm;
        const result: TFormResult = await action({
            section_id: sectionId,
            page_id: pageId,
            form_data: formValues,
        });
        setSubmitting(false);

        if (result.kind === 'validation') {
            setErrors(result.fieldErrors);
            setResultIsError(true);
            setResultMessage(errorMessage || result.message || 'Please review the highlighted fields.');
            return;
        }
        if (result.kind === 'error') {
            setResultIsError(true);
            setResultMessage(errorMessage || result.message);
            return;
        }
        setResultIsError(false);
        setResultMessage(successMessage || result.message || 'Saved');
        if (isLog) setFormValues({});

        // Refetch the page so a sibling show-user-input (and form-record values)
        // reflects the new/updated submission immediately.
        void queryClient.invalidateQueries({ queryKey: ['page'] });

        if (!ajax && result.redirectUrl) {
            router.push(result.redirectUrl);
        }
    }, [ajax, errorMessage, formValues, isLog, pageId, queryClient, sectionId, successMessage]);

    const onCancel = useCallback((): void => {
        if (cancelUrl) router.push(cancelUrl);
        else setFormValues({});
    }, [cancelUrl]);

    return { ctx, isSubmitting, resultMessage, resultIsError, onSubmit, onCancel };
}
