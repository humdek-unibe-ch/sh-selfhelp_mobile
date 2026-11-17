/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * What a form write means for the screen that sent it: saved, refused with
 * field errors, refused because the record changed meanwhile (409
 * `stale_version`), or failed. Pure, so `node --test` covers the mapping from
 * the backend's answers (see `__tests__/unit/formList.test.mjs`).
 */
import {
    getFormStaleVersion,
    type IFormStaleVersionData,
    type IFormSubmitData,
    type IFormSubmitResponse,
    type IFormUpdateResponse,
} from '@selfhelp/shared';

type TFormUpdateData = NonNullable<IFormUpdateResponse['data']>;

export type TFormResult =
    | { kind: 'ok'; data: IFormSubmitData | TFormUpdateData | undefined; message?: string; redirectUrl?: string }
    | { kind: 'validation'; fieldErrors: Record<string, string>; message?: string }
    /** The record changed since it was read: nothing was written. */
    | { kind: 'stale'; stale: IFormStaleVersionData }
    | { kind: 'error'; message: string };

interface IErrorBody {
    error?: unknown;
    message?: unknown;
    data?: { field_errors?: unknown; message?: unknown } | null;
}

/** A 2xx submit or update answer. */
export function normalizeFormResponse(resp: IFormSubmitResponse | IFormUpdateResponse): TFormResult {
    const data = resp.data;
    if (data?.field_errors && Object.keys(data.field_errors).length) {
        return { kind: 'validation', fieldErrors: data.field_errors, message: data.message };
    }
    if (resp.error) return { kind: 'error', message: resp.error };
    return { kind: 'ok', data, message: data?.message, redirectUrl: data?.redirect_url };
}

/** What a failed request means for the caller: a conflict, field errors, or the server's own message. */
export function failureOf(error: unknown): TFormResult {
    const stale = getFormStaleVersion(error);
    if (stale !== null) {
        return { kind: 'stale', stale };
    }

    const body = (error as { response?: { data?: IErrorBody | null } } | null | undefined)?.response?.data;
    const fieldErrors = body?.data?.field_errors;
    if (fieldErrors !== null && typeof fieldErrors === 'object' && Object.keys(fieldErrors).length > 0) {
        return {
            kind: 'validation',
            fieldErrors: fieldErrors as Record<string, string>,
            message: typeof body?.data?.message === 'string' ? body.data.message : undefined,
        };
    }

    const serverMessage = typeof body?.error === 'string' && body.error !== ''
        ? body.error
        : (typeof body?.message === 'string' && body.message !== '' ? body.message : null);

    return { kind: 'error', message: serverMessage ?? (error as Error | null | undefined)?.message ?? 'Request failed' };
}

/** What to tell the person about a write that did not succeed and has no field errors to show (an alert, a banner). */
export function describeFormFailure(result: Exclude<TFormResult, { kind: 'ok' }>, fallback: string): string {
    switch (result.kind) {
        case 'stale':
            return 'This entry was changed by someone else. Reload it and try again.';
        case 'validation':
            return result.message ?? fallback;
        default:
            return result.message !== '' ? result.message : fallback;
    }
}
