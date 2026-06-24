/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Page-modal store.
 *
 * Holds the keyword of the CMS page currently presented as a MODAL sheet over
 * whatever route is underneath. This is APP-WIDE core behaviour: any in-app
 * navigation to an OFF-MENU page (a page with no drawer/tab entry) opens it here
 * instead of routing full-screen, so closing returns to the previous page (see
 * `components/shell/usePageNavigation.ts` and `components/shell/PageModalHost.tsx`).
 *
 * The CMS Live Preview boot router (`app/_layout.tsx`) reuses the same store to
 * present an off-menu previewed keyword as a modal over home. Session-only
 * (in-memory), never persisted.
 */
import { create } from 'zustand';

interface IPageModalState {
    /** Keyword to show in the page modal, or null when no modal is open. */
    keyword: string | null;
    /** Open the page modal on a keyword. */
    open: (keyword: string) => void;
    /** Close the page modal. */
    close: () => void;
}

export const usePageModalStore = create<IPageModalState>((set) => ({
    keyword: null,
    open: (keyword) => set({ keyword }),
    close: () => set({ keyword: null }),
}));
