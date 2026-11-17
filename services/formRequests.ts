/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Pure builders of the three form write requests (`/forms/submit`,
 * `/forms/update`, `/forms/delete`).
 *
 * The backend routes accept exactly one verb each: `POST` to submit, `PUT` to
 * update and `DELETE` to delete (a `POST` to update or delete answers 405).
 * A write that carries a picked file travels as `multipart/form-data`, the way
 * the web renderer sends it: the form fields as plain parts, each file as a
 * file part named after its field, and the page, section, target record,
 * version and (when the person looks at the draft of the page) `preview` as
 * parts. Everything else travels as JSON.
 *
 * Nothing here talks to the network, so `node --test` covers the exact request
 * a screen sends (see `__tests__/unit/formList.test.mjs`).
 */
import {
    ENDPOINTS,
    type IFormDeleteRequest,
    type IFormSubmitRequest,
    type IFormUpdateRequest,
} from '@selfhelp/shared';

/** A file the person picked on this device, not yet uploaded. */
export interface IPickedFile {
    uri: string;
    name: string;
    mimeType?: string;
    size?: number;
}

/** One part of a multipart body: a text value or a file reference. */
export type TMultipartPart =
    | { name: string; value: string }
    | { name: string; file: { uri: string; name: string; type: string } };

export type TFormRequestBody =
    | { kind: 'json'; data: unknown }
    | { kind: 'multipart'; parts: TMultipartPart[] };

export interface IFormRequest {
    method: 'post' | 'put' | 'delete';
    url: string;
    body: TFormRequestBody;
}

export type TPickedFiles = Readonly<Record<string, IPickedFile>>;

const DEFAULT_FILE_TYPE = 'application/octet-stream';

/** A form value as a multipart text part: nothing is an empty part, structures are JSON. */
function partText(value: unknown): string {
    if (value === null || value === undefined) {
        return '';
    }
    if (typeof value === 'object') {
        return JSON.stringify(value);
    }
    return String(value);
}

function hasFiles(files: TPickedFiles): boolean {
    return Object.keys(files).length > 0;
}

function filePart(name: string, file: IPickedFile): TMultipartPart {
    return { name, file: { uri: file.uri, name: file.name, type: file.mimeType ?? DEFAULT_FILE_TYPE } };
}

/**
 * The multipart parts of a write: the fields (a field a file replaces is not
 * sent as text), the files, then the identifiers.
 */
function multipartParts(
    payload: IFormSubmitRequest | IFormUpdateRequest,
    files: TPickedFiles,
): TMultipartPart[] {
    const parts: TMultipartPart[] = [];

    for (const [name, value] of Object.entries(payload.form_data)) {
        if (name in files) {
            continue;
        }
        parts.push({ name, value: partText(value) });
    }
    for (const [name, file] of Object.entries(files)) {
        parts.push(filePart(name, file));
    }
    if (payload.page_id !== undefined) {
        parts.push({ name: 'page_id', value: String(payload.page_id) });
    }
    parts.push({ name: 'section_id', value: String(payload.section_id) });
    // The write acts on the draft of the page when the person looks at the draft (a multipart flag is text).
    if (payload.preview === true) {
        parts.push({ name: 'preview', value: '1' });
    }

    return parts;
}

/** `POST /forms/submit`: JSON, or multipart when a file was picked. */
export function buildSubmitRequest(payload: IFormSubmitRequest, files: TPickedFiles = {}): IFormRequest {
    if (!hasFiles(files)) {
        return { method: 'post', url: ENDPOINTS.FORMS.SUBMIT, body: { kind: 'json', data: payload } };
    }

    return {
        method: 'post',
        url: ENDPOINTS.FORMS.SUBMIT,
        body: { kind: 'multipart', parts: multipartParts(payload, files) },
    };
}

/**
 * `PUT /forms/update`: JSON, or multipart when a file was picked. The target
 * record travels as `update_based_on` (a bare `record_id` part would be read as
 * form data and create a new row); `expected_version` rides along when given.
 */
export function buildUpdateRequest(payload: IFormUpdateRequest, files: TPickedFiles = {}): IFormRequest {
    if (!hasFiles(files)) {
        return { method: 'put', url: ENDPOINTS.FORMS.UPDATE, body: { kind: 'json', data: payload } };
    }

    const parts = multipartParts(payload, files);
    if (payload.update_based_on !== undefined) {
        parts.push({ name: 'update_based_on', value: JSON.stringify(payload.update_based_on) });
    }
    if (payload.expected_version !== undefined) {
        parts.push({ name: 'expected_version', value: String(payload.expected_version) });
    }

    return { method: 'put', url: ENDPOINTS.FORMS.UPDATE, body: { kind: 'multipart', parts } };
}

/** `DELETE /forms/delete`: the JSON body carries the record, the section, the page and the version seen. */
export function buildDeleteRequest(payload: IFormDeleteRequest): IFormRequest {
    return { method: 'delete', url: ENDPOINTS.FORMS.DELETE, body: { kind: 'json', data: payload } };
}
