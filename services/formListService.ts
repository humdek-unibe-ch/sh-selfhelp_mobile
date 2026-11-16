/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Thin service over the read and one-click endpoints of a form list
 * (`/cms-api/v1/lists/{section_id}/...`).
 *
 * Create, update and delete of records go through the ordinary form endpoints
 * (`formsService.ts`): a list never has write routes of its own, so there is
 * one write pipeline. Every function unwraps the response envelope and keeps
 * the axios error shape, so `getFormStaleVersion` / `getFormListRestoreBlocked`
 * from `@selfhelp/shared` can read `data.reason`.
 */
import {
    ENDPOINTS,
    type IFormListCompareData,
    type IFormListCompareQuery,
    type IFormListCompareResponse,
    type IFormListHistoryData,
    type IFormListHistoryQuery,
    type IFormListHistoryResponse,
    type IFormListQuickActionData,
    type IFormListQuickActionRequest,
    type IFormListQuickActionResponse,
    type IFormListRestoreRequest,
    type IFormListRestoreResponse,
    type IFormListState,
    type IFormListStateResponse,
    type IFormListVersionData,
    type IFormListVersionResponse,
    type TFormListRestoreData,
} from '@selfhelp/shared';

import { getApiClient } from '@/services/apiClient';
import { formListStateUrl, type IFormListStateRequest } from '@/services/formListUrl';

export { formListStateUrl, type IFormListStateRequest } from '@/services/formListUrl';

/** The server-rendered state of one list for the current visitor and URL state. */
export async function fetchFormListState(sectionId: number, request: IFormListStateRequest): Promise<IFormListState> {
    const response = await getApiClient().get<IFormListStateResponse>(formListStateUrl(sectionId, request));
    return response.data.data;
}

/** Run a configured quick action on one record. The body carries nothing but the page and the version seen. */
export async function runFormListQuickAction(
    sectionId: number,
    recordId: number,
    actionId: string,
    body: IFormListQuickActionRequest,
): Promise<IFormListQuickActionData> {
    const response = await getApiClient().post<IFormListQuickActionResponse>(
        ENDPOINTS.LISTS.QUICK_ACTION(sectionId, recordId, actionId),
        body,
    );
    return response.data.data;
}

/** One page of a record's revisions, newest first. */
export async function fetchFormListHistory(
    sectionId: number,
    recordId: number,
    query: IFormListHistoryQuery,
): Promise<IFormListHistoryData> {
    const response = await getApiClient().get<IFormListHistoryResponse>(
        ENDPOINTS.LISTS.HISTORY(sectionId, recordId),
        { params: query },
    );
    return response.data.data;
}

/** One revision with its changes and the record as it stood after it (`preview`: the draft of the page is shown). */
export async function fetchFormListVersion(
    sectionId: number,
    recordId: number,
    version: number,
    pageId: number,
    preview = false,
): Promise<IFormListVersionData> {
    const response = await getApiClient().get<IFormListVersionResponse>(
        ENDPOINTS.LISTS.VERSION(sectionId, recordId, version),
        { params: { page_id: pageId, ...(preview ? { preview: 1 } : {}) } },
    );
    return response.data.data;
}

/** The changes between two versions of a record. */
export async function fetchFormListCompare(
    sectionId: number,
    recordId: number,
    query: IFormListCompareQuery,
): Promise<IFormListCompareData> {
    const response = await getApiClient().get<IFormListCompareResponse>(
        ENDPOINTS.LISTS.COMPARE(sectionId, recordId),
        { params: query },
    );
    return response.data.data;
}

/** Preview (`dry_run`) or perform a restore of an earlier version as a new revision. */
export async function restoreFormListVersion(
    sectionId: number,
    recordId: number,
    body: IFormListRestoreRequest,
): Promise<TFormListRestoreData> {
    const response = await getApiClient().post<IFormListRestoreResponse>(
        ENDPOINTS.LISTS.RESTORE(sectionId, recordId),
        body,
    );
    return response.data.data;
}
