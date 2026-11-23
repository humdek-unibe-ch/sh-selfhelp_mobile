/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * What the app does with a live-sync message (task `2026-11-20-live-sync-and-edit-lock`).
 *
 * The server sends `changed` with a list of tags (names and ids, never content). This module maps the
 * tags to the query roots that must be read again. It never decides who may see a change: it only
 * matches the tags the server sent with the tags the server put into each page payload
 * (`sync.depends_on`, contract C6) and with the access state it already holds.
 *
 * | Tag | Effect |
 * | --- | --- |
 * | `acl` | access changed: user data and everything that depends on who the person is, and a new stream bootstrap |
 * | `navigation` | menus and the page list |
 * | `page:<id>`, `page_draft:<id>`, `table:<id>`, `global_values` | the pages that named the tag, and the lists on them |
 * | the rest (`page_lock`, `section`, `asset`) | editor tags: the app has no admin and ignores them |
 *
 * Pure: it takes the minimal part of the TanStack query client it needs, so `node --test` covers it.
 */
import { pageDependsOn, type ISyncBlock } from '@selfhelp/shared';

import { FORM_LIST_HISTORY_ROOT, FORM_LIST_ROOT } from '@/services/formListQueryKeys';

/** Root of every cached page payload (`usePageContent`). */
export const PAGE_ROOT = 'page';
/** Root of the page list (`usePages`). */
export const PAGES_ROOT = 'pages';
/** Root of the navigation payload (`useNavigation`). */
export const NAVIGATION_ROOT = 'navigation';

/** The part of a cached query this module reads. */
export interface ISyncQuery {
    queryKey: readonly unknown[];
    state: { data: unknown };
}

/** The minimal part of the TanStack `QueryClient` this module needs. */
export interface ISyncQueryCache {
    invalidateQueries(
        filters: { queryKey: readonly unknown[]; predicate?: (query: ISyncQuery) => boolean },
        options?: { cancelRefetch?: boolean },
    ): unknown;
    getQueryCache(): { findAll(filters: { queryKey: readonly unknown[] }): ISyncQuery[] };
}

export interface ISyncApplyOptions {
    /** The key of the signed-in user's data; null for a guest (nothing to read again). */
    userDataKey: readonly unknown[] | null;
}

export interface ISyncApplyResult {
    /** The access of this audience changed: the stream must fetch a new bootstrap and reconnect. */
    rebootstrap: boolean;
}

/** The `sync` block of a cached page payload, or null (an older server, an error). */
export function syncBlockOf(data: unknown): ISyncBlock | null {
    if (typeof data !== 'object' || data === null) {
        return null;
    }
    const sync = (data as { sync?: unknown }).sync;
    if (typeof sync !== 'object' || sync === null) {
        return null;
    }
    return sync as ISyncBlock;
}

/** The id of a cached page payload, or null. */
function pageIdOf(data: unknown): number | null {
    if (typeof data !== 'object' || data === null) {
        return null;
    }
    const id = (data as { id?: unknown }).id;
    return typeof id === 'number' ? id : null;
}

/** The page id inside the key of a form list (`form-list`, server, account, language, platform, page, ...). */
export function pageIdOfFormListKey(queryKey: readonly unknown[]): number | null {
    if (queryKey[0] !== FORM_LIST_ROOT) {
        return null;
    }
    const pageId = queryKey[5];
    return typeof pageId === 'number' ? pageId : null;
}

/**
 * Everything that depends on who the person is: the page list, every page, the menus and every list. Used
 * when the access of the person changed (a message, a changed stamp, a return from the background).
 * `cancelRefetch: false` keeps a read that is already running instead of starting it again, so the same
 * change seen through the message and through the new stamp reads each query once.
 */
export function invalidateAccessQueries(cache: ISyncQueryCache): void {
    const options = { cancelRefetch: false };
    void cache.invalidateQueries({ queryKey: [PAGES_ROOT] }, options);
    void cache.invalidateQueries({ queryKey: [PAGE_ROOT] }, options);
    void cache.invalidateQueries({ queryKey: [NAVIGATION_ROOT] }, options);
    void cache.invalidateQueries({ queryKey: [FORM_LIST_ROOT] }, options);
    void cache.invalidateQueries({ queryKey: [FORM_LIST_HISTORY_ROOT] }, options);
}

/** Read again the pages (and the lists on them) whose `sync.depends_on` names one of the tags. */
function invalidateDependentPages(tags: readonly string[], cache: ISyncQueryCache): void {
    const pageIds = new Set<number>();
    for (const query of cache.getQueryCache().findAll({ queryKey: [PAGE_ROOT] })) {
        if (!pageDependsOn(syncBlockOf(query.state.data), tags)) {
            continue;
        }
        const id = pageIdOf(query.state.data);
        if (id !== null) {
            pageIds.add(id);
        }
    }

    void cache.invalidateQueries({
        queryKey: [PAGE_ROOT],
        predicate: (query) => pageDependsOn(syncBlockOf(query.state.data), tags),
    });

    if (pageIds.size === 0) {
        return;
    }
    // A list's key carries its page, not its table: a list is read again when its page named the tag.
    void cache.invalidateQueries({
        queryKey: [FORM_LIST_ROOT],
        predicate: (query) => {
            const pageId = pageIdOfFormListKey(query.queryKey);
            return pageId !== null && pageIds.has(pageId);
        },
    });
}

/**
 * Apply the tags of one change message (or of several merged ones).
 * Tags the app does not use are ignored; a tag that is not in the contract never reaches this function.
 */
export function applySyncTags(
    tags: readonly string[],
    cache: ISyncQueryCache,
    options: ISyncApplyOptions,
): ISyncApplyResult {
    if (tags.includes('acl')) {
        if (options.userDataKey !== null) {
            void cache.invalidateQueries({ queryKey: options.userDataKey });
        }
        // Every page, menu and list is read again: nothing else in the message can add to that.
        invalidateAccessQueries(cache);
        return { rebootstrap: true };
    }

    if (tags.includes('navigation')) {
        void cache.invalidateQueries({ queryKey: [NAVIGATION_ROOT] });
        void cache.invalidateQueries({ queryKey: [PAGES_ROOT] });
    }

    const pageTags = tags.filter(
        (tag) => tag === 'global_values' || tag.startsWith('page:') || tag.startsWith('page_draft:') || tag.startsWith('table:'),
    );
    if (pageTags.length > 0) {
        invalidateDependentPages(pageTags, cache);
    }

    return { rebootstrap: false };
}
