/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Query keys of the form lists (`entry-form-list` / `data-view`) and the
 * predicates that keep their caches apart from everything else.
 *
 * A list's cached rows belong to one server, one account (or guest), one
 * language, one platform, one page, one section, the declared route of the page
 * (a record template can read it) and one normalized URL state:
 * `formListCacheKey` from `@selfhelp/shared` builds exactly that key (the same
 * one the web renderer uses). The last part says whether the draft of the page
 * was shown: the draft and the published version can answer differently. Log out, a server switch, a new sign-in and an
 * access change drop or refresh every key under the two roots, and the roots
 * are never written to the persisted query cache: the same URL shows other
 * records to other people.
 *
 * Pure (no React Native), so `node --test` covers it.
 */
import { formListCacheKey, type IFormListCacheScope, type IFormListState } from '@selfhelp/shared';

/** Root of every list's state. */
export const FORM_LIST_ROOT = 'form-list';
/** Root of the history, version and comparison reads of a record. */
export const FORM_LIST_HISTORY_ROOT = 'form-list-history';

/**
 * How many leading parts of a list key identify the list itself: the root, the server, the account, the
 * language, the platform, the page, the section and the route of the page. After them come the URL state and
 * the preview marker.
 */
const LIST_IDENTITY_PARTS = 8;

export type TFormListQueryKey = readonly (string | number)[];

/** True for a key under one of the list roots. */
export function isFormListQueryKey(queryKey: readonly unknown[]): boolean {
    return queryKey[0] === FORM_LIST_ROOT || queryKey[0] === FORM_LIST_HISTORY_ROOT;
}

/** The marker of the page version a key belongs to. */
function previewMarker(preview: boolean | undefined): string {
    return preview === true ? 'preview' : 'published';
}

/** The key of one list in one URL state (`ownQuery` is the raw `<key>.*` query string). */
export function formListStateKey(scope: IFormListCacheScope, ownQuery: string, preview = false): TFormListQueryKey {
    return [...formListCacheKey(scope, ownQuery), previewMarker(preview)];
}

/**
 * True when two list keys belong to the same list of the same account, server,
 * language, page, route and page version (published or draft) and differ at
 * most in the URL state: the rows of the previous state may stay on screen
 * while the next one loads, never across lists, accounts, languages, servers,
 * routes or between the draft and the published version.
 */
export function isSameFormList(a: readonly unknown[], b: readonly unknown[]): boolean {
    // The identity, the URL state and the preview marker.
    if (a.length < LIST_IDENTITY_PARTS + 2 || b.length < LIST_IDENTITY_PARTS + 2) {
        return false;
    }
    for (let index = 0; index < LIST_IDENTITY_PARTS; index += 1) {
        if (a[index] !== b[index]) {
            return false;
        }
    }
    return a[a.length - 1] === b[b.length - 1];
}

/** Who and what a record's history reads belong to. */
export interface IFormListHistoryScope {
    apiBase: string;
    /** The signed-in account's id; null for a guest. */
    account: string | number | null;
    sectionId: number;
    recordId: number;
    /** The draft of the page is shown: a history read acts on the same page version as the list. */
    preview?: boolean;
}

function historyHead(scope: IFormListHistoryScope): TFormListQueryKey {
    return [
        FORM_LIST_HISTORY_ROOT,
        scope.apiBase,
        scope.account === null ? 'guest' : String(scope.account),
        scope.sectionId,
        scope.recordId,
    ];
}

/** One page of a record's revisions. */
export function formListHistoryKey(scope: IFormListHistoryScope, page: number): TFormListQueryKey {
    return [...historyHead(scope), 'history', page, previewMarker(scope.preview)];
}

/** One revision with its changes and the record as it stood after it. */
export function formListVersionKey(scope: IFormListHistoryScope, version: number): TFormListQueryKey {
    return [...historyHead(scope), 'version', version, previewMarker(scope.preview)];
}

/** The changes between two versions. */
export function formListCompareKey(scope: IFormListHistoryScope, from: number, to: number): TFormListQueryKey {
    return [...historyHead(scope), 'compare', from, to, previewMarker(scope.preview)];
}

/** The minimal cache the helpers below need (a TanStack `QueryClient` satisfies it). */
export interface IFormListQueryCache {
    removeQueries: (filters: { queryKey: readonly unknown[] }) => void;
    invalidateQueries: (filters: { queryKey: readonly unknown[] }) => unknown;
}

/** Drop every cached list and every cached history (sign-in, sign-out, server switch). */
export function removeFormListQueries(cache: IFormListQueryCache): void {
    cache.removeQueries({ queryKey: [FORM_LIST_ROOT] });
    cache.removeQueries({ queryKey: [FORM_LIST_HISTORY_ROOT] });
}

/** Mark every cached list stale and read the visible ones again (a write or an access change). */
export function invalidateFormListQueries(cache: IFormListQueryCache, options: { history?: boolean } = {}): void {
    void cache.invalidateQueries({ queryKey: [FORM_LIST_ROOT] });
    if (options.history !== false) {
        void cache.invalidateQueries({ queryKey: [FORM_LIST_HISTORY_ROOT] });
    }
}

/**
 * The list state with one record's version replaced, in its row and in the open record. The same object comes
 * back when the record is not in the state, so nothing re-renders for a list that does not show it.
 */
export function withRecordVersion(state: IFormListState, recordId: number, version: number): IFormListState {
    const rowShown = state.rows.some((row) => row.record_id === recordId && row.version !== version);
    const selectedShown = state.selected !== null && state.selected.record_id === recordId && state.selected.version !== version;
    if (!rowShown && !selectedShown) {
        return state;
    }
    return {
        ...state,
        rows: rowShown ? state.rows.map((row) => (row.record_id === recordId ? { ...row, version } : row)) : state.rows,
        selected: selectedShown && state.selected !== null ? { ...state.selected, version } : state.selected,
    };
}

/** The minimal cache `rememberRecordVersion` needs (a TanStack `QueryClient` satisfies it). */
export interface IFormListVersionCache {
    setQueriesData(
        filters: { queryKey: readonly unknown[] },
        updater: (data: IFormListState | undefined) => IFormListState | undefined,
    ): unknown;
}

/**
 * Take the version a write returned into every cached list that shows the record (F186). A quick action
 * changes the record, and the list is read again afterwards; until that read returns, a Delete or Edit pressed
 * on the same row would still name the old version and be refused as a conflict with the person's own change.
 */
export function rememberRecordVersion(cache: IFormListVersionCache, recordId: number, version: number): void {
    cache.setQueriesData({ queryKey: [FORM_LIST_ROOT] }, (data) =>
        data !== undefined && Array.isArray(data.rows) ? withRecordVersion(data, recordId, version) : data,
    );
}
