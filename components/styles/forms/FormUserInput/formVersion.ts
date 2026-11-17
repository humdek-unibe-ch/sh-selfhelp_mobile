/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Which version of a record a save is based on. The server refuses a save of
 * an existing record that names no version (400) and one that names an old
 * version (409: somebody changed the record meanwhile, nothing is written), so
 * the form must always send the version of the record it was filled from.
 *
 * Pure (no React Native): `node --test` covers every case.
 */

/** The version a save returned, with the record it belongs to. */
export interface ISavedRecordVersion {
    recordId: number;
    version: number;
}

export interface ISaveVersionInput {
    /** The form is the inline form of a list: it names the version of the record the list opened. */
    insideList: boolean;
    /** The version of the record the list opened (inside a list). */
    listVersion: number | null;
    recordId: number;
    /** The version of the record when the page was built (outside a list); `null` when the page offered none. */
    pageVersion: number | null;
    /** What the last successful save of this form returned. */
    saved: ISavedRecordVersion | null;
}

/**
 * The version a save of the existing record `recordId` names, or `null` when there is none (the form then
 * refuses to save and says why: nothing is guessed). A record form on a page keeps the version the page was
 * built with until the page is read again, so after a successful save the next save is based on the version
 * that save returned, not on the older one the page still holds.
 */
export function saveBasedOnVersion(input: ISaveVersionInput): number | null {
    if (input.insideList) {
        return input.listVersion;
    }
    const { saved } = input;
    if (saved !== null && saved.recordId === input.recordId && saved.version > (input.pageVersion ?? 0)) {
        return saved.version;
    }

    return input.pageVersion;
}
