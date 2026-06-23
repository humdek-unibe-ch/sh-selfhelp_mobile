/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Pure file-constraint validation for the `file-input` form control.
 *
 * The CMS exposes HTML-style constraints (`web_file_input_accept`,
 * `web_file_input_max_size`); a picked file must satisfy them BEFORE upload
 * (mobile rendering plan 11.6). Kept RN-free so the accept/size contract is
 * unit-testable under `node --test`.
 */

export interface IPickedFile {
    name?: string;
    /** Size in bytes (expo-image-picker `fileSize`). */
    size?: number;
    /** MIME type, e.g. `image/png`. */
    mimeType?: string;
}

export interface IFileConstraints {
    /** HTML `accept`-style list, e.g. `"image/*,.pdf"`. Empty = allow any. */
    accept?: string;
    /** Maximum size in bytes. `undefined`/0 = no limit. */
    maxSizeBytes?: number;
}

export interface IAcceptList {
    /** Lower-cased extensions WITHOUT the dot, e.g. `["pdf", "png"]`. */
    extensions: string[];
    /** MIME patterns, e.g. `["image/*", "application/pdf"]`. */
    mimePatterns: string[];
}

export function parseAcceptList(accept: string | undefined): IAcceptList {
    const extensions: string[] = [];
    const mimePatterns: string[] = [];
    if (!accept) return { extensions, mimePatterns };
    for (const tokenRaw of accept.split(',')) {
        const token = tokenRaw.trim().toLowerCase();
        if (!token) continue;
        if (token.startsWith('.')) {
            extensions.push(token.slice(1));
        } else if (token.includes('/')) {
            mimePatterns.push(token);
        } else {
            // Bare extension without a dot (lenient).
            extensions.push(token);
        }
    }
    return { extensions, mimePatterns };
}

function extensionOf(name: string | undefined): string | undefined {
    if (!name) return undefined;
    const dot = name.lastIndexOf('.');
    return dot >= 0 ? name.slice(dot + 1).toLowerCase() : undefined;
}

function mimeMatches(mimeType: string, pattern: string): boolean {
    if (pattern === '*/*') return true;
    if (pattern.endsWith('/*')) {
        return mimeType.startsWith(pattern.slice(0, pattern.length - 1));
    }
    return mimeType === pattern;
}

/** Whether a file satisfies the accept list (empty list = allow any). */
export function fileMatchesAccept(file: IPickedFile, list: IAcceptList): boolean {
    if (list.extensions.length === 0 && list.mimePatterns.length === 0) {
        return true;
    }
    const ext = extensionOf(file.name);
    if (ext && list.extensions.includes(ext)) {
        return true;
    }
    const mime = file.mimeType?.toLowerCase();
    if (mime && list.mimePatterns.some((p) => mimeMatches(mime, p))) {
        return true;
    }
    return false;
}

/** Validate a picked file against the CMS constraints before upload. */
export function validateFile(
    file: IPickedFile,
    constraints: IFileConstraints,
): { ok: boolean; error?: string } {
    const list = parseAcceptList(constraints.accept);
    if (!fileMatchesAccept(file, list)) {
        return { ok: false, error: 'This file type is not allowed.' };
    }
    if (constraints.maxSizeBytes && file.size && file.size > constraints.maxSizeBytes) {
        return { ok: false, error: 'This file is too large.' };
    }
    return { ok: true };
}
