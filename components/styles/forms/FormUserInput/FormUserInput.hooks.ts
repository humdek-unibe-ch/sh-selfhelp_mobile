/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Hooks for the FormUserInput style: state + submit handler.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { IFormContext } from '../FormContext';
import { navigateToPage } from '@/components/shell/usePageNavigation';
import { submitForm, updateForm, type TFormResult } from '@/services/formsService';

interface IUseFormControllerArgs {
    sectionId: number;
    pageId: number;
    formName: string;
    isLog: boolean;
    existingRecordId?: number | null;
    initialValues?: Record<string, string>;
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
    const {
        sectionId,
        pageId,
        formName,
        isLog,
        existingRecordId = null,
        initialValues = {},
        successMessage,
        errorMessage,
        cancelUrl,
        ajax,
    } = args;

    const hydrationKey = `${sectionId}:${existingRecordId ?? 'create'}`;
    const initialValuesKey = JSON.stringify(initialValues);
    const queryClient = useQueryClient();
    const [formValues, setFormValues] = useState<Record<string, unknown>>(() => initialValues);
    const [errors, setErrors] = useState<Record<string, string | undefined>>({});
    const [isSubmitting, setSubmitting] = useState(false);
    const [resultMessage, setResultMessage] = useState<string | null>(null);
    const [resultIsError, setResultIsError] = useState(false);

    useEffect(() => {
        setFormValues(initialValues);
        setErrors({});
        setResultMessage(null);
        setResultIsError(false);
    }, [hydrationKey, initialValuesKey, initialValues]);

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
        [errors, formName, formValues, isLog, isSubmitting, sectionId],
    );

    const onSubmit = useCallback(async (): Promise<void> => {
        setSubmitting(true);
        setResultMessage(null);
        setErrors({});

        const basePayload = {
            section_id: sectionId,
            page_id: pageId,
            form_data: formValues,
        };

        let result: TFormResult;
        if (isLog || !existingRecordId) {
            result = await submitForm(basePayload);
        } else {
            result = await updateForm({
                ...basePayload,
                update_based_on: { record_id: existingRecordId },
            });
        }
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
        if (isLog || !existingRecordId) {
            setFormValues({});
        }

        void queryClient.invalidateQueries({ queryKey: ['page'] });

        if (!ajax && result.redirectUrl) {
            navigateToPage(result.redirectUrl);
        }
    }, [
        ajax,
        errorMessage,
        existingRecordId,
        formValues,
        isLog,
        pageId,
        queryClient,
        sectionId,
        successMessage,
    ]);

    const onCancel = useCallback((): void => {
        if (cancelUrl) navigateToPage(cancelUrl);
        else setFormValues(initialValues);
    }, [cancelUrl, initialValues]);

    return { ctx, isSubmitting, resultMessage, resultIsError, onSubmit, onCancel };
}
