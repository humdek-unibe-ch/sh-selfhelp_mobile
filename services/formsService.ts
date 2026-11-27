/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Centralised form-submission helpers used by `form-log`, `form-record`,
 * `entryRecordDelete` and the form lists. Wraps the three `/forms/*` endpoints,
 * normalises responses, and surfaces `field_errors` so styles can map them to
 * inputs.
 *
 * The requests themselves are built by `formRequests.ts` (`POST` submit, `PUT`
 * update, `DELETE` delete, multipart when a file was picked) and the answers
 * are read by `formResults.ts`; both are pure and covered by `node --test`. A
 * save, delete or restore based on a record that changed meanwhile is answered
 * with 409 `stale_version`; it comes back as `{ kind: 'stale' }` so the caller
 * can keep the draft and offer a choice.
 */

import type {
    IFormDeleteRequest,
    IFormDeleteResponse,
    IFormSubmitRequest,
    IFormSubmitResponse,
    IFormUpdateRequest,
    IFormUpdateResponse,
} from '@selfhelp/shared';

import { getApiClient } from '@/services/apiClient';
import {
    buildDeleteRequest,
    buildSubmitRequest,
    buildUpdateRequest,
    toFormData,
    type IFormRequest,
    type TPickedFiles,
} from '@/services/formRequests';
import { failureOf, normalizeFormResponse, type TFormResult } from '@/services/formResults';

export type { TFormResult } from '@/services/formResults';

async function send<T>(request: IFormRequest): Promise<T> {
    const client = getApiClient();
    const multipart = request.body.kind === 'multipart';
    const data = request.body.kind === 'multipart' ? toFormData(request.body.parts) : request.body.data;
    // The shared client defaults to JSON; a multipart body needs its own type
    // (the native stack adds the boundary).
    const headers = multipart ? { 'Content-Type': 'multipart/form-data' } : undefined;

    switch (request.method) {
        case 'put':
            return (await client.put<T>(request.url, data, { headers })).data;
        case 'delete':
            return (await client.delete<T>(request.url, { data, headers })).data;
        default:
            return (await client.post<T>(request.url, data, { headers })).data;
    }
}

export async function submitForm(payload: IFormSubmitRequest, files: TPickedFiles = {}): Promise<TFormResult> {
    try {
        return normalizeFormResponse(await send<IFormSubmitResponse>(buildSubmitRequest(payload, files)));
    } catch (e) {
        return failureOf(e);
    }
}

export async function updateForm(payload: IFormUpdateRequest, files: TPickedFiles = {}): Promise<TFormResult> {
    try {
        return normalizeFormResponse(await send<IFormUpdateResponse>(buildUpdateRequest(payload, files)));
    } catch (e) {
        return failureOf(e);
    }
}

export async function deleteFormRecord(payload: IFormDeleteRequest): Promise<TFormResult> {
    try {
        const body = await send<IFormDeleteResponse>(buildDeleteRequest(payload));
        if (body.error) return { kind: 'error', message: body.error };
        return { kind: 'ok', data: undefined, message: body.data?.message };
    } catch (e) {
        return failureOf(e);
    }
}
