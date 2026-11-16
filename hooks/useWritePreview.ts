/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Whether the person looks at the DRAFT of the page.
 *
 * Every write (submit, update, delete, quick action, restore) and every list
 * read (state, history, version, comparison, a historical file) is judged by the
 * page version the person sees: the published one, or the draft when the page
 * was fetched with `preview`. The app names the draft exactly when it shows the
 * draft and never decides what the draft allows; the server refuses it to
 * anybody who may not read it. The page fetch uses the same policy
 * (`resolvePreviewRequest`), so a screen and the requests it sends cannot
 * disagree.
 */
import { resolvePreviewRequest } from '@/services/previewPolicy';
import { useAuthStore } from '@/stores/authStore';
import { useDevModeStore } from '@/stores/devModeStore';

/** True when the dev preview switch is on and somebody is signed in (the server still decides who may see the draft). */
export function useWritePreview(): boolean {
    const previewMode = useDevModeStore((s) => s.previewMode);
    const accessToken = useAuthStore((s) => s.accessToken);

    return resolvePreviewRequest(previewMode, Boolean(accessToken));
}
