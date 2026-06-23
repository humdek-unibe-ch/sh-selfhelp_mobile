/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Web-preview modal store.
 *
 * Holds the keyword the CMS Live Preview asked to present as a MODAL over home
 * (an off-menu page in `modal=auto`, or an explicit `modal=on`). The boot router
 * in `app/_layout.tsx` sets it once; `PreviewModalHost` renders the overlay and
 * clears it on close. Session-only (preview is ephemeral), never persisted.
 */
import { create } from 'zustand';

interface IPreviewModalState {
    /** Keyword to show in the preview modal, or null when no modal is open. */
    keyword: string | null;
    /** Open the preview modal on a keyword. */
    open: (keyword: string) => void;
    /** Close the preview modal. */
    close: () => void;
}

export const usePreviewModalStore = create<IPreviewModalState>((set) => ({
    keyword: null,
    open: (keyword) => set({ keyword }),
    close: () => set({ keyword: null }),
}));
