/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Centralised form-submission helpers used by `form-log`, `form-record`,
 * and `entryRecordDelete`. Wraps the three `/forms/*` endpoints, normalises
 * responses, and surfaces `field_errors` so styles can map them to inputs.
 */

import {
    ENDPOINTS,
    type IFormDeleteRequest,
    type IFormDeleteResponse,
    type IFormSubmitData,
    type IFormSubmitRequest,
    type IFormSubmitResponse,
    type IFormUpdateRequest,
    type IFormUpdateResponse,
} from '@selfhelp/shared';

import { getApiClient } from '@/services/apiClient';

type TFormUpdateData = NonNullable<IFormUpdateResponse['data']>;

export type TFormResult =
    | { kind: 'ok'; data: IFormSubmitData | TFormUpdateData | undefined; message?: string; redirectUrl?: string }
    | { kind: 'validation'; fieldErrors: Record<string, string>; message?: string }
    | { kind: 'error'; message: string };

function normalize(resp: IFormSubmitResponse | IFormUpdateResponse): TFormResult {
    const data = resp.data;
    if (data?.field_errors && Object.keys(data.field_errors).length) {
        return { kind: 'validation', fieldErrors: data.field_errors, message: data.message };
    }
    if (resp.error) return { kind: 'error', message: resp.error };
    return { kind: 'ok', data, message: data?.message, redirectUrl: data?.redirect_url };
}

export async function submitForm(payload: IFormSubmitRequest): Promise<TFormResult> {
    try {
        const resp = await getApiClient().post<IFormSubmitResponse>(ENDPOINTS.FORMS.SUBMIT, payload);
        return normalize(resp.data);
    } catch (e) {
        return { kind: 'error', message: (e as Error).message };
    }
}

export async function updateForm(payload: IFormUpdateRequest): Promise<TFormResult> {
    try {
        const resp = await getApiClient().post<IFormUpdateResponse>(ENDPOINTS.FORMS.UPDATE, payload);
        return normalize(resp.data);
    } catch (e) {
        return { kind: 'error', message: (e as Error).message };
    }
}

export async function deleteFormRecord(payload: IFormDeleteRequest): Promise<TFormResult> {
    try {
        const resp = await getApiClient().post<IFormDeleteResponse>(ENDPOINTS.FORMS.DELETE, payload);
        if (resp.data.error) return { kind: 'error', message: resp.data.error };
        return { kind: 'ok', data: undefined, message: resp.data.data?.message };
    } catch (e) {
        return { kind: 'error', message: (e as Error).message };
    }
}
