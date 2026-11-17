/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Hooks for the FormUserInput style: state + submit handler.
 *
 * Outside a list the form behaves as it always did. Inside an
 * `entry-form-list` (`listForm` is set) the list decides which record is
 * edited and which version a save is based on, and is told what happened: the
 * form does not show its own success message, reset itself, redirect or
 * refresh the page. A save refused because the record changed meanwhile
 * (409 `stale_version`) is handed to the list and the draft stays in the form.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import type { IFormContext } from '../FormContext';
import type { IFormListFormContext } from '../FormListFormContext';
import { saveBasedOnVersion, type ISavedRecordVersion } from './formVersion';
import {
    buildFormData,
    findMissingRequired,
    isFormDirty,
    requiredFieldErrors,
    requiredMessage,
    withUntouchedDefaults,
    type IFormFieldInfo,
} from '../formFields';
import { navigateToPage } from '@/components/shell/usePageNavigation';
import { useWritePreview } from '@/hooks/useWritePreview';
import type { IPickedFile, TPickedFiles } from '@/services/formRequests';
import { submitForm, updateForm, type TFormResult } from '@/services/formsService';

interface IUseFormControllerArgs {
    sectionId: number;
    pageId: number;
    formName: string;
    isLog: boolean;
    existingRecordId?: number | null;
    /**
     * The version of the record when the page was built (outside a list). A save names it; the server refuses a
     * save without one (400) and one based on an old version (409, the draft stays in the form).
     */
    existingRecordVersion?: number | null;
    initialValues?: Record<string, string>;
    successMessage?: string | null;
    errorMessage?: string | null;
    cancelUrl?: string | null;
    ajax: boolean;
    /** The input fields of the form: required and file fields drive validation and uploads. */
    fields?: readonly IFormFieldInfo[];
    /** The list that draws this form, when it is the inline form of one. */
    listForm?: IFormListFormContext | null;
}

const NO_FIELDS: readonly IFormFieldInfo[] = [];

function say(message: string): void {
    void AccessibilityInfo.announceForAccessibility(message);
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
        existingRecordVersion = null,
        initialValues = {},
        successMessage,
        errorMessage,
        cancelUrl,
        ajax,
        fields = NO_FIELDS,
        listForm = null,
    } = args;

    const hydrationKey = `${sectionId}:${existingRecordId ?? 'create'}`;
    const initialValuesKey = JSON.stringify(initialValues);
    const queryClient = useQueryClient();
    // The write acts on the page version the person looks at (the draft only in preview mode).
    const preview = useWritePreview();
    // The version a save of this record returned last: the next save of the same page load is based on it
    // (the page keeps the version it was built with until it is read again).
    const savedVersionRef = useRef<ISavedRecordVersion | null>(null);
    const [formValues, setFormValues] = useState<Record<string, unknown>>(() => initialValues);
    const [files, setFiles] = useState<TPickedFiles>({});
    const [errors, setErrors] = useState<Record<string, string | undefined>>({});
    const [isSubmitting, setSubmitting] = useState(false);
    const [resultMessage, setResultMessage] = useState<string | null>(null);
    const [resultIsError, setResultIsError] = useState(false);

    // What the latest render knows, for callbacks that must not change identity
    // (the dirty check the list holds, the submit guard).
    const initialRef = useRef(initialValues);
    initialRef.current = initialValues;
    const valuesRef = useRef(formValues);
    valuesRef.current = formValues;
    const filesRef = useRef(files);
    filesRef.current = files;
    // `isSubmitting` is visible only after the next render, so a double tap would
    // otherwise write the record twice.
    const submittingRef = useRef(false);
    // What the inputs show while the person has not touched them: the form sends it too.
    const defaultsRef = useRef<Record<string, string>>({});
    // The banner that names the missing fields goes away when the last one is filled.
    const requiredBannerRef = useRef(false);

    useEffect(() => {
        setFormValues(initialRef.current);
        setFiles({});
        setErrors({});
        setResultMessage(null);
        setResultIsError(false);
        requiredBannerRef.current = false;
    }, [hydrationKey, initialValuesKey]);

    useEffect(() => {
        if (requiredBannerRef.current && Object.keys(errors).length === 0) {
            requiredBannerRef.current = false;
            setResultMessage(null);
            setResultIsError(false);
        }
    }, [errors]);

    const registerDirtyCheck = listForm?.registerDirtyCheck;
    useEffect(() => {
        if (!registerDirtyCheck) {
            return undefined;
        }
        registerDirtyCheck(() => isFormDirty(initialRef.current, valuesRef.current, filesRef.current));
        return () => registerDirtyCheck(null);
    }, [registerDirtyCheck]);

    const setValue = useCallback((name: string, value: unknown): void => {
        setFormValues((prev) => ({ ...prev, [name]: value }));
        // The person is correcting the field: what was said about it is out of date.
        setErrors((prev) => {
            if (prev[name] === undefined) {
                return prev;
            }
            const { [name]: _fixed, ...rest } = prev;
            return rest;
        });
    }, []);

    const registerDefault = useCallback((name: string, value: string): (() => void) => {
        defaultsRef.current[name] = value;
        return () => {
            if (defaultsRef.current[name] === value) {
                delete defaultsRef.current[name];
            }
        };
    }, []);

    const setFile = useCallback((name: string, file: IPickedFile | null): void => {
        setFiles((prev) => {
            if (file === null) {
                const { [name]: _removed, ...rest } = prev;
                return rest;
            }
            return { ...prev, [name]: file };
        });
    }, []);

    const ctx = useMemo<IFormContext>(
        () => ({
            formName,
            sectionId,
            isLog,
            isSubmitting,
            values: formValues,
            errors,
            setValue,
            registerDefault,
            files,
            setFile,
        }),
        [errors, files, formName, formValues, isLog, isSubmitting, registerDefault, sectionId, setFile, setValue],
    );

    const insideList = listForm !== null;
    const listExpectedVersion = listForm?.expectedVersion ?? null;
    const onListSaved = listForm?.onSaved;
    const onListStale = listForm?.onStale;

    const onSubmit = useCallback(async (): Promise<void> => {
        if (submittingRef.current) {
            return;
        }

        // What the person sees is what is checked and sent, untouched defaults included.
        const submitted = withUntouchedDefaults(formValues, defaultsRef.current);
        const missing = findMissingRequired(fields, submitted, files);
        if (missing.length > 0) {
            const message = requiredMessage(missing);
            requiredBannerRef.current = true;
            setErrors(requiredFieldErrors(missing));
            setResultIsError(true);
            setResultMessage(message);
            say(message);
            return;
        }
        requiredBannerRef.current = false;

        // A list edits the record it opened whatever style the form has; outside
        // a list only a record form updates.
        const isUpdate = existingRecordId !== null && (insideList || !isLog);

        // The version the save is based on: the list names the one of the record it opened; a record form the one
        // its page was built with, or the one its last save returned.
        let expectedVersion: number | null = null;
        if (isUpdate && existingRecordId !== null) {
            expectedVersion = saveBasedOnVersion({
                insideList,
                listVersion: listExpectedVersion,
                recordId: existingRecordId,
                pageVersion: existingRecordVersion,
                saved: savedVersionRef.current,
            });
            // The server refuses an update that names no version. A page that offered none (an old server) cannot save.
            if (expectedVersion === null) {
                const message = errorMessage
                    || 'This entry cannot be saved because the page did not say which version of it you are editing. Reload the page and try again.';
                setResultIsError(true);
                setResultMessage(message);
                say(message);
                return;
            }
        }

        submittingRef.current = true;
        setSubmitting(true);
        setResultMessage(null);
        setErrors({});

        const basePayload = {
            section_id: sectionId,
            page_id: pageId,
            form_data: buildFormData(submitted, fields, insideList),
            ...(preview ? { preview: true } : {}),
        };

        let result: TFormResult;
        if (isUpdate && expectedVersion !== null) {
            result = await updateForm(
                {
                    ...basePayload,
                    update_based_on: { record_id: existingRecordId },
                    expected_version: expectedVersion,
                },
                files,
            );
        } else {
            result = await submitForm(basePayload, files);
        }
        submittingRef.current = false;
        setSubmitting(false);

        if (result.kind === 'validation') {
            const message = errorMessage || result.message || 'Please review the highlighted fields.';
            setErrors(result.fieldErrors);
            setResultIsError(true);
            setResultMessage(message);
            say(message);
            return;
        }
        if (result.kind === 'stale') {
            if (onListStale) {
                // Nothing was written; the list shows the conflict, the draft stays here.
                onListStale(result.stale);
                return;
            }
            const message = errorMessage || 'This entry was changed by someone else. Reload the page and try again.';
            setResultIsError(true);
            setResultMessage(message);
            say(message);
            return;
        }
        if (result.kind === 'error') {
            const message = errorMessage || result.message;
            setResultIsError(true);
            setResultMessage(message);
            say(message);
            return;
        }

        // Inside a list the list owns what happens next: it closes the form,
        // reads its rows again and says the entry was saved.
        if (onListSaved) {
            const saved = result.data as { record_id?: number; version?: number } | undefined;
            onListSaved({
                recordId: saved?.record_id ?? existingRecordId,
                version: typeof saved?.version === 'number' ? saved.version : null,
                created: !isUpdate,
            });
            return;
        }

        // The next save of this record is based on the version this one wrote.
        const savedVersion = (result.data as { version?: number } | undefined)?.version;
        if (isUpdate && existingRecordId !== null && typeof savedVersion === 'number') {
            savedVersionRef.current = { recordId: existingRecordId, version: savedVersion };
        }

        setResultIsError(false);
        const message = successMessage || result.message || 'Saved';
        setResultMessage(message);
        say(message);
        if (!isUpdate) {
            setFormValues({});
            setFiles({});
        }

        void queryClient.invalidateQueries({ queryKey: ['page'] });

        if (!ajax && result.redirectUrl) {
            navigateToPage(result.redirectUrl);
        }
    }, [
        ajax,
        errorMessage,
        existingRecordId,
        existingRecordVersion,
        fields,
        files,
        formValues,
        insideList,
        isLog,
        listExpectedVersion,
        onListSaved,
        onListStale,
        pageId,
        preview,
        queryClient,
        sectionId,
        successMessage,
    ]);

    const onCancel = useCallback((): void => {
        if (listForm) {
            listForm.onCancel();
            return;
        }
        if (cancelUrl) navigateToPage(cancelUrl);
        else {
            setFormValues(initialRef.current);
            setFiles({});
        }
    }, [cancelUrl, listForm]);

    return { ctx, isSubmitting, resultMessage, resultIsError, onSubmit, onCancel };
}
