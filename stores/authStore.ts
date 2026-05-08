/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Auth state. The access token is held in memory only; the refresh
 * token lives in `expo-secure-store` (mobile) or `localStorage` (web,
 * dev preview only). Logout clears both.
 */

import type { IUserData } from '@selfhelp/shared';
import { create } from 'zustand';

interface IAuthState {
    accessToken: string | null;
    user: IUserData | null;
    bootstrapped: boolean;
    setSession: (accessToken: string, user: IUserData) => void;
    setUser: (user: IUserData | null) => void;
    setAccessToken: (accessToken: string | null) => void;
    setBootstrapped: (b: boolean) => void;
    clear: () => void;
}

export const useAuthStore = create<IAuthState>((set) => ({
    accessToken: null,
    user: null,
    bootstrapped: false,
    setSession: (accessToken, user) => set({ accessToken, user }),
    setUser: (user) => set({ user }),
    setAccessToken: (accessToken) => set({ accessToken }),
    setBootstrapped: (b) => set({ bootstrapped: b }),
    clear: () => set({ accessToken: null, user: null, bootstrapped: false }),
}));
