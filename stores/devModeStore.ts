/**
 * Dev-only mode flags surfaced from the floating debug panel and the
 * server picker. Never available in production builds (the panel and
 * the toggles are not mounted unless `runtimeConfig.isDevInstance`).
 *
 *   - `previewMode`: when true, page fetches add `?preview=true` so we
 *     see draft/unpublished CMS content. Mirrors the web frontend's
 *     `sh_preview` cookie.
 *   - `phoneFrame`: web preview wraps the app in a phone-sized frame so
 *     content is laid out the way it will look on a real device. Toggle
 *     it off to use the full browser viewport for screenshots/QA.
 *
 * Persisted via the same secure-store wrapper used for the server URL —
 * works on web (localStorage) and native (SecureStore).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const isWeb = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

interface IDevModeState {
    previewMode: boolean;
    phoneFrame: boolean;
    setPreviewMode: (value: boolean) => void;
    setPhoneFrame: (value: boolean) => void;
}

export const useDevModeStore = create<IDevModeState>()(
    persist(
        (set) => ({
            previewMode: false,
            phoneFrame: true,
            setPreviewMode: (value) => set({ previewMode: value }),
            setPhoneFrame: (value) => set({ phoneFrame: value }),
        }),
        {
            name: 'sh.dev_mode',
            storage: isWeb
                ? {
                      getItem: (name) => {
                          const raw = window.localStorage.getItem(name);
                          return raw ? JSON.parse(raw) : null;
                      },
                      setItem: (name, value) => {
                          window.localStorage.setItem(name, JSON.stringify(value));
                      },
                      removeItem: (name) => window.localStorage.removeItem(name),
                  }
                : undefined,
        }
    )
);
