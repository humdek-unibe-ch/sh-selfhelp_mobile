/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Client-side substitution for the entry-table `edit_url` template.
 * The single-brace `{record_id}` placeholder is NOT a backend `{{…}}` token.
 */

export function resolveEntryTableEditUrl(template: string, recordId: number): string {
    return template.replaceAll('{record_id}', String(recordId));
}
