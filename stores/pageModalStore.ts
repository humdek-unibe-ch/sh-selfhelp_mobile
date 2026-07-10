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
 * Parameterized public URLs (`/team-members/5`) also carry `resolvePath` so the
 * modal fetches via `GET /pages/resolve` and hydrates route params correctly.
 *
 * The CMS Live Preview boot router (`app/_layout.tsx`) reuses the same store to
 * present an off-menu previewed keyword as a modal over home. Session-only
 * (in-memory), never persisted.
 */
import { create } from 'zustand';

interface IPageModalState {
    /** Keyword to show in the page modal, or null when no modal is open. */
    keyword: string | null;
    /** Public path for parameterized pages; omitted for static routes. */
    resolvePath: string | null;
    /** Open the page modal on a keyword (optional resolve path for route params). */
    open: (keyword: string, resolvePath?: string | null) => void;
    /** Close the page modal. */
    close: () => void;
}

export const usePageModalStore = create<IPageModalState>((set) => ({
    keyword: null,
    resolvePath: null,
    open: (keyword, resolvePath = null) => set({ keyword, resolvePath: resolvePath ?? null }),
    close: () => set({ keyword: null, resolvePath: null }),
}));
