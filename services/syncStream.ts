/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * The pure parts of the live-sync stream (`hooks/useAclEventStream.ts`):
 *
 * - `parseBootstrap` reads the answer of `GET /auth/events`. A guest gets the public sync topic only
 *   (contract C4), a signed-in person their own, their groups', their roles' and the public one.
 * - `subscribeUrl` builds the hub URL for exactly those topics.
 * - `createSyncDispatcher` receives the raw `changed` events, merges what arrives within the random delay
 *   (0 to 300 ms, decision "instant") and hands the tags to `apply` once.
 * - `streamPlan` says whether the stream runs and whether a return from the background needs a catch-up.
 *
 * No React Native imports, so `node --test` covers it.
 */
import { parseSyncMessageJson, syncRefetchDelayMs } from '@selfhelp/shared';

import type { ISyncApplyResult } from '@/services/syncApply';

export interface ISyncBootstrap {
    hubUrl: string;
    /** The private access topic of a signed-in person (`acl-changed`); null for a guest. */
    topic: string | null;
    /** Sync topics to subscribe to: `[user, groups, roles, public]`, or `[public]` for a guest. */
    syncTopics: string[];
    token: string | null;
    expiresIn: number;
}

const DEFAULT_EXPIRES_IN_S = 3_600;

function stringOrNull(value: unknown): string | null {
    return typeof value === 'string' && value !== '' ? value : null;
}

/** Read the data of the events bootstrap; null when it is unusable (no hub, or no topic to listen to). */
export function parseBootstrap(data: unknown): ISyncBootstrap | null {
    if (typeof data !== 'object' || data === null) {
        return null;
    }
    const raw = data as Record<string, unknown>;
    const hubUrl = stringOrNull(raw.hubUrl);
    if (hubUrl === null) {
        return null;
    }
    if (!(typeof raw.token === 'string' || raw.token === null || raw.token === undefined)) {
        return null;
    }

    const syncTopics = Array.isArray(raw.syncTopics)
        ? [...new Set((raw.syncTopics as unknown[]).filter((t): t is string => typeof t === 'string' && t !== ''))]
        : [];
    const topic = stringOrNull(raw.topic);
    if (syncTopics.length === 0 && topic === null) {
        return null;
    }

    return {
        hubUrl,
        topic,
        syncTopics,
        token: typeof raw.token === 'string' ? raw.token : null,
        expiresIn: typeof raw.expiresIn === 'number' && raw.expiresIn > 0 ? raw.expiresIn : DEFAULT_EXPIRES_IN_S,
    };
}

/**
 * The topics to listen to. A core with live sync names `syncTopics` (the person's own access topic is then
 * covered by the `acl` tag of their sync topic); an older core names only `topic`, which carries `acl-changed`.
 */
export function streamTopics(bootstrap: ISyncBootstrap): string[] {
    if (bootstrap.syncTopics.length > 0) {
        return bootstrap.syncTopics;
    }
    return bootstrap.topic !== null ? [bootstrap.topic] : [];
}

/** The hub URL with one `topic` parameter per topic. */
export function subscribeUrl(bootstrap: ISyncBootstrap): string {
    const topics = streamTopics(bootstrap).map((topic) => `topic=${encodeURIComponent(topic)}`);
    const separator = bootstrap.hubUrl.includes('?') ? '&' : '?';
    return `${bootstrap.hubUrl}${separator}${topics.join('&')}`;
}

export interface ISyncDispatcherDeps {
    /** Read again what the tags name; says whether the stream must fetch a new bootstrap. */
    apply: (tags: readonly string[]) => ISyncApplyResult;
    /** The stream must fetch a new bootstrap and reconnect (the person's groups or roles changed). */
    onRebootstrap: () => void;
    /** Injectable for tests; the default is a random 0 to 300 ms. */
    delayMs?: () => number;
    setTimer?: (callback: () => void, ms: number) => unknown;
    clearTimer?: (handle: unknown) => void;
}

export interface ISyncDispatcher {
    /** The raw `data` string of one `changed` event. Anything that is not a valid message is ignored. */
    receive: (raw: string) => void;
    /** Drop what waits for its delay (the stream closed). */
    dispose: () => void;
}

/**
 * Merge the messages that arrive within one delay into one call of `apply`. Several clients of one change
 * do not read at the same millisecond, and one change that reaches this client on two topics reads once.
 */
export function createSyncDispatcher(deps: ISyncDispatcherDeps): ISyncDispatcher {
    const delayMs = deps.delayMs ?? (() => syncRefetchDelayMs('changed'));
    const setTimer = deps.setTimer ?? ((callback, ms) => setTimeout(callback, ms));
    const clearTimer = deps.clearTimer ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));
    const pending = new Set<string>();
    let timer: unknown = null;

    const flush = (): void => {
        timer = null;
        const tags = [...pending];
        pending.clear();
        if (tags.length === 0) {
            return;
        }
        if (deps.apply(tags).rebootstrap) {
            deps.onRebootstrap();
        }
    };

    return {
        receive: (raw) => {
            const message = parseSyncMessageJson(raw);
            if (message === null) {
                return;
            }
            for (const tag of message.tags) {
                pending.add(tag);
            }
            if (timer === null) {
                timer = setTimer(flush, delayMs());
            }
        },
        dispose: () => {
            if (timer !== null) {
                clearTimer(timer);
                timer = null;
            }
            pending.clear();
        },
    };
}

export interface IStreamEligibility {
    /** The server is chosen and the app finished its first sign-in check. */
    ready: boolean;
    /** The live preview of the CMS (a read-only session that cannot open the stream). */
    preview: boolean;
    /** The app is in the foreground. */
    foreground: boolean;
}

/** The stream runs only while the app is open, for a guest as well as for a signed-in person. */
export function shouldStream(state: IStreamEligibility): boolean {
    return state.ready && !state.preview && state.foreground;
}

/**
 * True when the app comes back to the foreground after it had been in the background: it heard nothing in
 * between, so what is on screen is read again (the stream itself reconnects with a new bootstrap).
 */
export function needsCatchUp(wasBackground: boolean, nowForeground: boolean): boolean {
    return wasBackground && nowForeground;
}
