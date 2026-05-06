import type { ILanguagePreference } from '@selfhelp/shared';
import { create } from 'zustand';

interface ILanguageState {
    locale: string | null;
    languageId: number | null;
    available: ILanguagePreference[];
    setLocale: (locale: string, languageId: number | null) => void;
    setAvailable: (langs: ILanguagePreference[]) => void;
}

export const useLanguageStore = create<ILanguageState>((set) => ({
    locale: null,
    languageId: null,
    available: [],
    setLocale: (locale, languageId) => set({ locale, languageId }),
    setAvailable: (langs) => set({ available: langs }),
}));
