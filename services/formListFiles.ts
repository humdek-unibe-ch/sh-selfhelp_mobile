/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Reading a file an earlier version of a record held (the history of a form
 * list): which request asks for it, under which name the phone keeps it, what
 * a refusal means and which version a file belongs to.
 *
 * The server route needs the visitor's session and checks the access to the
 * history of that record, so the system browser cannot call it: the app reads
 * the bytes itself (`formListFileDownload.ts`) and hands them to the share
 * sheet. Everything in here is pure (no React Native, no network), so
 * `node --test` covers the exact request.
 */
import { ENDPOINTS } from '@selfhelp/shared';

/** Which file of which version is wanted. */
export interface IHistoricalFileTarget {
    sectionId: number;
    recordId: number;
    /** The version the file belongs to: the state of the record AFTER this version holds it. */
    version: number;
    fieldKey: string;
    /** The language of the stored value (a file field can hold another file per language). */
    languageId: number;
    /** The position in a field that holds several files (0 for the first). */
    index: number;
    /** The page the list is on; the server checks the access through it. */
    pageId: number;
    /** The person looks at the draft of the page: a download acts on the same version as the history shows. */
    preview?: boolean;
}

/** The request of one historical file: the route and its query. */
export function historicalFileRequest(target: IHistoricalFileTarget): { url: string; params: Record<string, string> } {
    const params: Record<string, string> = {
        page_id: String(target.pageId),
        file_language: String(target.languageId > 0 ? target.languageId : 1),
        index: String(Math.max(0, target.index)),
    };
    if (target.preview) {
        params.preview = '1';
    }

    return { url: ENDPOINTS.LISTS.VERSION_FILE(target.sectionId, target.recordId, target.version, target.fieldKey), params };
}

const MAX_NAME_LENGTH = 100;

/**
 * A name the phone may create in its cache: never a path (no folders, no `..`),
 * no control characters, never empty, bounded. The extension is kept, because
 * the share sheet decides what can open the file by it.
 */
export function downloadFileName(name: string, fallback = 'file'): string {
    const lastSegment = name.split(/[\\/]/u).pop() ?? '';
    // Control characters are removed, and what a file system or the share sheet treats specially is replaced.
    const cleaned = Array.from(lastSegment)
        .filter((character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127)
        .join('')
        .replace(/[<>:"|?*]/gu, '_')
        .replace(/^\.+/u, '')
        .trim();
    if (cleaned === '') {
        return fallback;
    }
    if (cleaned.length <= MAX_NAME_LENGTH) {
        return cleaned;
    }
    const dot = cleaned.lastIndexOf('.');
    const extension = dot > 0 && cleaned.length - dot <= 12 ? cleaned.slice(dot) : '';

    return cleaned.slice(0, MAX_NAME_LENGTH - extension.length) + extension;
}

/** What the file is called in the cache: the version is part of it, so two versions of one name never replace each other. */
export function cachedFileName(version: number, name: string): string {
    return `v${version}-${downloadFileName(name)}`;
}

const MIME_TYPES: Readonly<Record<string, string>> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    txt: 'text/plain',
    csv: 'text/csv',
    json: 'application/json',
    zip: 'application/zip',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

/** The type the share sheet is told; anything unknown is opaque bytes. */
export function mimeTypeOfFileName(name: string): string {
    const dot = name.lastIndexOf('.');
    const extension = dot === -1 ? '' : name.slice(dot + 1).toLowerCase();

    return MIME_TYPES[extension] ?? 'application/octet-stream';
}

/** Why a file could not be had: the person may not read the history, the file is gone, or something else went wrong. */
export type THistoricalFileFailure = 'denied' | 'gone' | 'failed';

/**
 * What a failed read means. The body of a refusal is bytes (the request asks
 * for bytes), so only the status code is read.
 */
export function historicalFileFailure(error: unknown): THistoricalFileFailure {
    const status = (error as { response?: { status?: unknown } } | null | undefined)?.response?.status;
    if (status === 401 || status === 403) {
        return 'denied';
    }
    if (status === 404 || status === 410) {
        return 'gone';
    }

    return 'failed';
}

/** Same visitor-facing lines FormList history shows when a file download fails. */
export const FILE_DOWNLOAD_FAILURE_MESSAGES = {
    denied: 'You may not download this file.',
    gone: 'This file is no longer available.',
    failed: 'This file could not be downloaded. Try again.',
} as const;

/** Message for a failed current-file or historical-file download (pure; Alert uses it). */
export function messageForFileDownloadFailure(error: unknown): string {
    return FILE_DOWNLOAD_FAILURE_MESSAGES[historicalFileFailure(error)];
}

/** The versions the two sides of a change belong to. `null`: there is no such version (nothing came before the first). */
export interface IChangeVersions {
    before: number | null;
    after: number | null;
}

/** The changes of ONE revision: what it left behind is its own version, what it replaced is the one before. */
export function fileVersionsOfRevision(version: number): IChangeVersions {
    return { before: version > 1 ? version - 1 : null, after: version };
}

/** The changes between two versions: the earlier one is the "before" side, the later one the "after" side. */
export function fileVersionsOfComparison(from: number, to: number): IChangeVersions {
    return { before: Math.min(from, to), after: Math.max(from, to) };
}
