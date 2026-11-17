/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Hooks of the form lists (`entry-form-list` / `data-view`) on mobile.
 *
 * - `useFormListQueryState`: the list's own state (page, search, sort, filters,
 *   open record and mode). It starts from the link that opened the screen
 *   (`<key>.record=5`, ...), changes with what the visitor does, and a new
 *   link to the open screen replaces it.
 * - `useFormListState`: reads the list for that state. The state the server
 *   put in the page payload is shown at once while the current one is read.
 *   The cache key carries server, account, language, page, section and state,
 *   so one account never reads another account's rows.
 * - Writes use the ordinary form endpoints (`formsService`); this file adds
 *   quick actions, history, comparison and restore.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
    getFormStaleVersion,
    type IFormListCompareData,
    type IFormListHistoryData,
    type IFormListFailure,
    type IFormListQuickActionData,
    type IFormListRestoreRequest,
    type IFormListState,
    type IFormListUrlState,
    type IFormListVersionData,
    type TFormListRestoreData,
    type TFormListUrlChange,
} from '@selfhelp/shared';

import { useRouteParams } from '@/components/renderer/RouteParamsContext';
import {
    fetchFormListCompare,
    fetchFormListHistory,
    fetchFormListState,
    fetchFormListVersion,
    restoreFormListVersion,
    runFormListQuickAction,
} from '@/services/formListService';
import {
    formListCompareKey,
    formListHistoryKey,
    formListStateKey,
    formListVersionKey,
    invalidateFormListQueries,
    isSameFormList,
    type IFormListHistoryScope,
} from '@/services/formListQueryKeys';
import { deleteFormRecord, type TFormResult } from '@/services/formsService';
import { useWritePreview } from '@/hooks/useWritePreview';
import { useAuthStore } from '@/stores/authStore';
import { useLanguageStore } from '@/stores/languageStore';
import { useServerStore } from '@/stores/serverStore';

import {
    FORM_LIST_INPUT_DEBOUNCE_MS,
    FORM_LIST_TEXT,
    failureOfError,
    failureOfSeed,
    isAccessFailure,
    listCacheScope,
    ownQueryFromRouteParams,
    queryAfterChange,
    urlStateOfQuery,
    type IFormListSeed,
    type TFormListText,
    type TFormListTextKey,
} from './FormList.logic';

/** A state read is fresh for this long; the list's own writes invalidate it at once. */
const LIST_STALE_MS = 15_000;
const LIST_GC_MS = 2 * 60_000;

// -- text ---------------------------------------------------------------------------

/** The list's words in the visitor's language (`formList.<key>` in the app's translations, English otherwise). */
export function useFormListText(): TFormListText {
    const { t } = useTranslation();
    return useMemo(() => {
        const text: Record<string, string> = {};
        for (const key of Object.keys(FORM_LIST_TEXT) as TFormListTextKey[]) {
            text[key] = t(`formList.${key}`, { defaultValue: FORM_LIST_TEXT[key] });
        }
        return text as unknown as TFormListText;
    }, [t]);
}

// -- the list's own state --------------------------------------------------------------

export interface IFormListQueryState {
    /** The raw `<key>.*` query string of the current state (empty = the list as it is). */
    query: string;
    urlState: IFormListUrlState;
    navigate: (change: TFormListUrlChange) => void;
    /** Drop every parameter and show the whole list. */
    clear: () => void;
}

/**
 * The state of one list. It lives in the screen, not in the router: typing in
 * the search box or turning a page never pushes a navigation entry. A link
 * that carries the list's parameters (a deep link, a notification) sets it,
 * also while the screen is already open.
 */
export function useFormListQueryState(listKey: string): IFormListQueryState {
    const routeParams = useRouteParams();
    const routeQuery = useMemo(() => ownQueryFromRouteParams(routeParams, listKey), [routeParams, listKey]);
    const [query, setQuery] = useState(routeQuery);
    const [seenRoute, setSeenRoute] = useState(routeQuery);

    // A new link to this screen replaces the state (adjusting state while rendering, as React documents).
    if (routeQuery !== seenRoute) {
        setSeenRoute(routeQuery);
        setQuery(routeQuery);
    }

    const urlState = useMemo(() => urlStateOfQuery(query, listKey), [query, listKey]);
    const navigate = useCallback(
        (change: TFormListUrlChange) => setQuery((current) => queryAfterChange(current, listKey, change)),
        [listKey],
    );
    const clear = useCallback(() => setQuery(''), []);

    return { query, urlState, navigate, clear };
}

// -- reading the list --------------------------------------------------------------------

interface IUseFormListStateOptions {
    pageId: number;
    sectionId: number;
    listKey: string;
    /** The raw `<key>.*` query string of the state to read. */
    query: string;
    /** What the page payload carried for this list (the state of the list without any parameter). */
    seed: IFormListSeed | null;
    /**
     * The declared route parameters of the page (`page.route_params`). The layout of a record can read them, so a
     * list on another route is another state: they are part of the cache key and of the request.
     */
    route?: Readonly<Record<string, string | undefined>> | null;
}

export interface IUseFormListStateResult {
    state: IFormListState | null;
    /** Why there is no state: a server-rendered `list_error`, a refusal, or a failed read. */
    failure: IFormListFailure | null;
    /** A refresh that failed while the last state is still shown. */
    refreshFailure: IFormListFailure | null;
    /** True until the first state (or failure) is known. */
    isLoading: boolean;
    /** The state shown belongs to the previous state of this list (or to the page payload) while the new one is read. */
    isPlaceholder: boolean;
    isFetching: boolean;
    /** Read the state again; clears a failure the server rendered. */
    retry: () => void;
    queryKey: readonly (string | number)[];
}

/** The account and server a read belongs to; also the identity of the history keys. */
export function useFormListIdentity(): { apiBase: string; account: number | null } {
    const serverUrl = useServerStore((s) => s.serverUrl);
    const account = useAuthStore((s) => s.user?.id ?? null);
    return { apiBase: serverUrl ?? 'no-server', account };
}

export function useFormListState(options: IUseFormListStateOptions): IUseFormListStateResult {
    const { pageId, sectionId, listKey, query, seed, route = null } = options;
    const { apiBase, account } = useFormListIdentity();
    const serverHydrated = useServerStore((s) => s.hydrated);
    const bootstrapped = useAuthStore((s) => s.bootstrapped);
    const languageId = useLanguageStore((s) => s.languageId);
    // The draft and the published version of the page can answer differently: the read says which one the person sees.
    const preview = useWritePreview();

    const queryKey = useMemo(
        () => formListStateKey(
            listCacheScope({ apiBase, account, languageId: languageId ?? 0, pageId, sectionId, key: listKey, route }),
            query,
            preview,
        ),
        [apiBase, account, languageId, pageId, sectionId, listKey, query, route, preview],
    );
    const keyText = queryKey.join('|');

    // The page payload was rendered without any list parameter: it describes the
    // list's default state only.
    const seedState = query === '' ? (seed?.state ?? null) : null;
    const seedFailure = query === '' && seed?.error && !seed.state ? failureOfSeed(seed.error) : null;
    const [retried, setRetried] = useState<string | null>(null);
    const seedFailureActive = seedFailure !== null && retried !== keyText;

    const canRead = apiBaseKnown(apiBase) && serverHydrated && bootstrapped && pageId > 0 && sectionId > 0 && listKey !== '';

    const result = useQuery<IFormListState, unknown>({
        queryKey,
        queryFn: () => fetchFormListState(sectionId, { pageId, languageId, listQuery: query, preview, route }),
        enabled: canRead && !seedFailureActive,
        staleTime: LIST_STALE_MS,
        gcTime: LIST_GC_MS,
        // The page payload has no known age: it is shown while the state is read, and replaced by it.
        refetchOnMount: true,
        retry: false,
        // Rows of the same list stay on screen while the next page or search loads, never across lists, accounts or languages.
        placeholderData: (previousData, previousQuery) =>
            previousQuery !== undefined && isSameFormList(previousQuery.queryKey, queryKey)
                ? previousData
                : (seedState ?? undefined),
    });

    const retry = useCallback(() => {
        if (seedFailureActive) {
            setRetried(keyText);
            return;
        }
        void result.refetch();
    }, [result, keyText, seedFailureActive]);

    const readFailure = result.error ? failureOfError(result.error) : null;
    // A refusal (sign-in expired, access revoked, the list gone) hides the cached rows: they may belong to a person
    // who may no longer see them. Any other failed refresh keeps the rows and says they may be out of date.
    const refused = readFailure !== null && isAccessFailure(readFailure);

    let failure: IFormListFailure | null = null;
    if (seedFailureActive) {
        failure = seedFailure;
    } else if (readFailure !== null && (result.data === undefined || refused)) {
        failure = readFailure;
    }

    return {
        state: seedFailureActive || refused ? null : (result.data ?? null),
        failure,
        refreshFailure: !seedFailureActive && !refused && result.isRefetchError && result.data !== undefined ? readFailure : null,
        isLoading: !seedFailureActive && result.isLoading,
        isPlaceholder: !seedFailureActive && result.isPlaceholderData,
        isFetching: result.isFetching,
        retry,
        queryKey,
    };
}

function apiBaseKnown(apiBase: string): boolean {
    return apiBase !== 'no-server';
}

// -- text that follows the state, committed after the visitor paused ----------------------

/**
 * A text field that follows the list state but commits to it only after the
 * person paused typing. The state stays the single truth: a reset or a new
 * link changes the text, typing changes the state once per pause.
 */
export function useDebouncedCommit(stateValue: string, commit: (value: string) => void, delayMs = FORM_LIST_INPUT_DEBOUNCE_MS) {
    // What the person typed; null follows the state.
    const [draft, setDraft] = useState<string | null>(null);
    // The trimmed text last sent to the state (or the state value when it changed elsewhere).
    const [committed, setCommitted] = useState(stateValue);
    const [seen, setSeen] = useState(stateValue);

    if (stateValue !== seen) {
        setSeen(stateValue);
        if (stateValue !== committed) {
            setDraft(null);
            setCommitted(stateValue);
        }
    }

    const text = draft ?? stateValue;

    useEffect(() => {
        if (draft === null || draft.trim() === committed) {
            return undefined;
        }
        const timer = setTimeout(() => {
            setCommitted(draft.trim());
            commit(draft);
        }, delayMs);
        return () => clearTimeout(timer);
    }, [draft, committed, commit, delayMs]);

    const flush = useCallback(() => {
        if (draft !== null && draft.trim() !== committed) {
            setCommitted(draft.trim());
            commit(draft);
        }
    }, [draft, committed, commit]);

    return { text, setText: setDraft, flush };
}

// -- announcements -------------------------------------------------------------------------

/** Tell assistive technology what just happened (a save, a delete, a restored version) and keep the words on a live region. */
export function useAnnouncer(): { announcement: string; announce: (message: string) => void } {
    const [announcement, setAnnouncement] = useState('');

    const announce = useCallback((message: string) => {
        setAnnouncement(message);
        void AccessibilityInfo.announceForAccessibility(message);
    }, []);

    useEffect(() => {
        if (announcement === '') {
            return undefined;
        }
        const timer = setTimeout(() => setAnnouncement(''), 5000);
        return () => clearTimeout(timer);
    }, [announcement]);

    return { announcement, announce };
}

// -- writes ----------------------------------------------------------------------------------

interface IDeleteRecordVariables {
    recordId: number;
    /** The version the person saw; the server refuses a stale delete with 409. */
    expectedVersion: number;
}

/**
 * Delete one record of a list. The request carries the version seen, so a
 * record someone else changed meanwhile is not deleted blindly (409, nothing
 * written: the error is `{ kind: 'stale' }`).
 */
export function useFormListDeleteMutation(pageId: number, sectionId: number) {
    const queryClient = useQueryClient();
    const preview = useWritePreview();
    return useMutation<void, Exclude<TFormResult, { kind: 'ok' }>, IDeleteRecordVariables>({
        mutationFn: async ({ recordId, expectedVersion }) => {
            const result = await deleteFormRecord({
                record_id: recordId,
                page_id: pageId,
                section_id: sectionId,
                expected_version: expectedVersion,
                ...(preview ? { preview: true } : {}),
            });
            if (result.kind !== 'ok') {
                throw result;
            }
        },
        onSuccess: () => {
            invalidateFormListQueries(queryClient);
        },
    });
}

interface IQuickActionVariables {
    recordId: number;
    actionId: string;
    expectedVersion: number;
}

/** Run a quick action on one record: the server applies the author's assignments as an ordinary edit. */
export function useFormListQuickActionMutation(pageId: number, sectionId: number) {
    const queryClient = useQueryClient();
    const preview = useWritePreview();
    return useMutation<IFormListQuickActionData, unknown, IQuickActionVariables>({
        mutationFn: ({ recordId, actionId, expectedVersion }) =>
            runFormListQuickAction(sectionId, recordId, actionId, {
                page_id: pageId,
                expected_version: expectedVersion,
                ...(preview ? { preview: true } : {}),
            }),
        onSuccess: () => {
            invalidateFormListQueries(queryClient);
        },
    });
}

/** True when an error is the 409 of a stale write. */
export function isStaleError(error: unknown): boolean {
    if (error !== null && typeof error === 'object' && 'kind' in error) {
        return (error as { kind?: unknown }).kind === 'stale';
    }
    return getFormStaleVersion(error) !== null;
}

// -- history ---------------------------------------------------------------------------------

interface IHistoryTarget {
    pageId: number;
    sectionId: number;
    recordId: number | null;
}

const HISTORY_PAGE_SIZE = 10;

function useHistoryScope(target: IHistoryTarget): IFormListHistoryScope {
    const { apiBase, account } = useFormListIdentity();
    // A history read acts on the same page version as the list the person looks at.
    const preview = useWritePreview();
    return useMemo(
        () => ({ apiBase, account, sectionId: target.sectionId, recordId: target.recordId ?? 0, preview }),
        [apiBase, account, target.sectionId, target.recordId, preview],
    );
}

/** One page of a record's revisions, newest first. */
export function useFormListHistory(target: IHistoryTarget, page: number) {
    const scope = useHistoryScope(target);
    const { pageId, sectionId, recordId } = target;
    return useQuery<IFormListHistoryData, unknown>({
        queryKey: formListHistoryKey(scope, page),
        queryFn: () => fetchFormListHistory(sectionId, recordId as number, {
            page_id: pageId,
            page,
            page_size: HISTORY_PAGE_SIZE,
            ...(scope.preview ? { preview: true } : {}),
        }),
        enabled: recordId !== null && pageId > 0,
        staleTime: 0,
        gcTime: LIST_GC_MS,
        placeholderData: keepPreviousData,
        retry: false,
    });
}

/** One revision with its changes and the record as it stood after it. */
export function useFormListVersion(target: IHistoryTarget, version: number | null) {
    const scope = useHistoryScope(target);
    const { pageId, sectionId, recordId } = target;
    return useQuery<IFormListVersionData, unknown>({
        queryKey: formListVersionKey(scope, version ?? 0),
        queryFn: () => fetchFormListVersion(sectionId, recordId as number, version as number, pageId, scope.preview === true),
        enabled: recordId !== null && version !== null && pageId > 0,
        staleTime: 0,
        gcTime: LIST_GC_MS,
        retry: false,
    });
}

/** The changes between two versions (the current one is a version like any other). */
export function useFormListCompare(target: IHistoryTarget, from: number | null, to: number | null) {
    const scope = useHistoryScope(target);
    const { pageId, sectionId, recordId } = target;
    return useQuery<IFormListCompareData, unknown>({
        queryKey: formListCompareKey(scope, from ?? 0, to ?? 0),
        queryFn: () => fetchFormListCompare(sectionId, recordId as number, {
            page_id: pageId,
            from: from as number,
            to: to as number,
            ...(scope.preview ? { preview: true } : {}),
        }),
        enabled: recordId !== null && from !== null && to !== null && pageId > 0,
        staleTime: 0,
        gcTime: LIST_GC_MS,
        retry: false,
    });
}

interface IRestoreVariables extends Omit<IFormListRestoreRequest, 'page_id'> {
    recordId: number;
}

/**
 * Preview (`dry_run`) or perform the restore of an earlier version. A real
 * restore is a new revision written through the ordinary pipeline; it never
 * rewinds history. Only the real restore refreshes the lists.
 */
export function useFormListRestoreMutation(pageId: number, sectionId: number) {
    const queryClient = useQueryClient();
    const preview = useWritePreview();
    return useMutation<TFormListRestoreData, unknown, IRestoreVariables>({
        mutationFn: ({ recordId, ...body }) =>
            restoreFormListVersion(sectionId, recordId, { ...body, page_id: pageId, ...(preview ? { preview: true } : {}) }),
        onSuccess: (data) => {
            if (!data.dry_run) {
                invalidateFormListQueries(queryClient);
            }
        },
    });
}
