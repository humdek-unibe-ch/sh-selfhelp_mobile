/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * The pure part of the mobile plugin host-services bridge
 * (`pluginHostServices.ts`): what a plugin's `upload` and `requestPermission`
 * mean, with every device and network call injected.
 *
 * It has no React Native, Expo or axios import, so `node --test` covers the
 * exact rules a plugin relies on (`__tests__/unit/pluginHostServices.test.mjs`):
 * the checks that refuse a request before anything is sent, the multipart body,
 * the clean-up of temporary files, the answer shape, and how a permission
 * answer is mapped. `pluginHostServices.ts` wires the real HTTP client, the
 * file system and the permission libraries into it.
 */
import type {
    IMobileHostResponse,
    IMobileHostUploadFile,
    IMobileHostUploadRequest,
    TMobileHostPermission,
    TMobileHostPermissionState,
} from '@selfhelp/shared/plugin-sdk';

import type { TMultipartPart } from '@/services/formRequests';

/** One total size per upload request: the files and the text parts (C27). 25 MB. */
export const PLUGIN_UPLOAD_MAX_BYTES = 25 * 1024 * 1024;

const ABSOLUTE_URL = /^[a-z][a-z0-9+.-]*:\/\//i;

/** The answer for an absolute path: a plugin must not send a token-bearing call off-origin. */
export const ABSOLUTE_URL_ERROR = 'Absolute URLs are not allowed for host requests.';

export function isAbsoluteUrl(path: string): boolean {
    return ABSOLUTE_URL.test(path);
}

export function extractReason(body: unknown): string | undefined {
    if (body && typeof body === 'object' && 'reason' in body) {
        const reason = (body as { reason?: unknown }).reason;
        if (typeof reason === 'string') return reason;
    }
    return undefined;
}

export function extractError(body: unknown, fallback: string): string {
    if (body && typeof body === 'object') {
        const record = body as { error?: unknown; message?: unknown };
        if (typeof record.error === 'string' && record.error !== '') return record.error;
        if (typeof record.message === 'string' && record.message !== '') return record.message;
    }
    return fallback;
}

/**
 * The answer for a request that failed. A 401 the host could not recover (the
 * refresh itself failed) is `sessionExpired`, so the plugin shows "session
 * expired" instead of a generic error. Reads the axios error structurally.
 */
export function hostFailure<TData>(err: unknown): IMobileHostResponse<TData> {
    const error = err as { response?: { status?: number; data?: unknown }; message?: string } | null;
    const status = error?.response?.status ?? 0;
    const body = error?.response?.data ?? null;
    return {
        ok: false,
        status,
        data: body as TData | null,
        reason: extractReason(body),
        error: extractError(body, error?.message ?? 'Request failed'),
        sessionExpired: status === 401,
    };
}

function refused<TData>(reason: string, error: string): IMobileHostResponse<TData> {
    return { ok: false, status: 0, data: null, reason, error };
}

/** The size of a base64 text in bytes, without decoding it. */
export function base64ByteLength(base64: string): number {
    const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
    return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

function hasText(value: unknown): value is string {
    return typeof value === 'string' && value !== '';
}

function isValidFile(file: IMobileHostUploadFile): boolean {
    if (!file || !hasText(file.field) || !hasText(file.name) || !hasText(file.type)) return false;
    return hasText(file.uri) !== hasText(file.base64);
}

/** A file written to a temporary place for the request, removed afterwards. */
export interface IUploadTempFile {
    uri: string;
    cleanup: () => Promise<void> | void;
}

/** The request the host sends after the checks passed. */
export interface IUploadCall {
    method: 'POST' | 'PUT';
    path: string;
    query?: Record<string, string | number | boolean>;
    headers?: Record<string, string>;
    parts: TMultipartPart[];
}

/** Everything `performHostUpload` needs from the device and the network. */
export interface IUploadDeps {
    /** Native: write the base64 to a temporary file. Web preview: a `data:` URI. */
    materializeBase64: (file: { base64: string; name: string; type: string }) => Promise<IUploadTempFile>;
    /** Size of a file the plugin named by `uri`, or `null` when it cannot be told. */
    sizeOfUri: (uri: string) => Promise<number | null>;
    /** The authenticated HTTP call (token, headers and the single 401 refresh are the host's). It throws on a non-2xx answer. */
    send: (call: IUploadCall) => Promise<{ status: number; data: unknown }>;
    /** Total size limit; defaults to {@link PLUGIN_UPLOAD_MAX_BYTES}. */
    maxBytes?: number;
    /** Called with the answer of a failed request, for the host log. */
    onFailure?: (response: IMobileHostResponse, call: IUploadCall) => void;
}

function utf8Length(text: string): number {
    return new TextEncoder().encode(text).length;
}

/**
 * `host.upload`: check the request, build one multipart body, send it, answer in
 * the `IMobileHostResponse` shape, and remove every temporary file whatever the
 * result. A request that breaks a rule is answered without sending anything:
 * `invalid_upload` (no file, or a file with both or neither of `uri` and
 * `base64`) or `file_too_large`.
 */
export async function performHostUpload<TData>(
    req: IMobileHostUploadRequest,
    deps: IUploadDeps,
): Promise<IMobileHostResponse<TData>> {
    if (typeof req?.path !== 'string' || isAbsoluteUrl(req.path)) {
        return { ok: false, status: 0, data: null, error: ABSOLUTE_URL_ERROR };
    }

    const method = req.method ?? 'POST';
    const files = req.files;
    if ((method !== 'POST' && method !== 'PUT') || !Array.isArray(files) || files.length === 0 || !files.every(isValidFile)) {
        return refused('invalid_upload', 'An upload needs at least one file with a name, a type and exactly one of uri or base64.');
    }

    const fields = Object.entries(req.fields ?? {});
    const limit = deps.maxBytes ?? PLUGIN_UPLOAD_MAX_BYTES;
    let total = fields.reduce((sum, [name, value]) => sum + utf8Length(name) + utf8Length(String(value)), 0);
    const tooLarge = (): IMobileHostResponse<TData> =>
        refused('file_too_large', `An upload may not be larger than ${Math.floor(limit / (1024 * 1024))} MB.`);
    if (total > limit) return tooLarge();
    for (const file of files) {
        if (hasText(file.base64)) {
            total += base64ByteLength(file.base64);
        } else {
            total += (await deps.sizeOfUri(file.uri as string)) ?? 0;
        }
        if (total > limit) return tooLarge();
    }

    const temps: IUploadTempFile[] = [];
    let call: IUploadCall | null = null;
    try {
        const parts: TMultipartPart[] = fields.map(([name, value]) => ({ name, value: String(value) }));
        for (const file of files) {
            let uri = file.uri as string;
            if (hasText(file.base64)) {
                const temp = await deps.materializeBase64({ base64: file.base64, name: file.name, type: file.type });
                temps.push(temp);
                uri = temp.uri;
            }
            parts.push({ name: file.field, file: { uri, name: file.name, type: file.type } });
        }

        call = { method, path: req.path, query: req.query, headers: req.headers, parts };
        const resp = await deps.send(call);
        return { ok: true, status: resp.status, data: (resp.data ?? null) as TData | null };
    } catch (err) {
        const failure = hostFailure<TData>(err);
        if (call) deps.onFailure?.(failure, call);
        return failure;
    } finally {
        for (const temp of temps) {
            try {
                await temp.cleanup();
            } catch {
                /* a temporary file that cannot be removed is in the app cache, which the system empties */
            }
        }
    }
}

/** What a permission library answers. */
export interface IPermissionAnswer {
    granted: boolean;
    canAskAgain: boolean;
}

export type TPermissionAsker = () => Promise<IPermissionAnswer>;

/** `granted`; `blocked` when the system will not ask again (`canAskAgain === false`); otherwise `denied`. */
export function mapPermissionAnswer(answer: IPermissionAnswer): TMobileHostPermissionState {
    if (answer.granted) return 'granted';
    return answer.canAskAgain === false ? 'blocked' : 'denied';
}

/**
 * `host.requestPermission`: ask through the injected library call for that kind.
 * A kind the host does not know, or a library that throws, answers `denied`.
 */
export async function requestHostPermission(
    kind: TMobileHostPermission,
    askers: Readonly<Record<TMobileHostPermission, TPermissionAsker>>,
): Promise<TMobileHostPermissionState> {
    const ask = Object.prototype.hasOwnProperty.call(askers, kind) ? askers[kind] : undefined;
    if (!ask) return 'denied';
    try {
        return mapPermissionAnswer(await ask());
    } catch {
        return 'denied';
    }
}
