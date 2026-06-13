import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import vi from './locales/vi.json';

const LANGUAGE_STORAGE_KEY = 'app_language';
const DEFAULT_LANGUAGE = 'en';
const SUPPORTED_LANGUAGES = ['en', 'vi'];

const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
const initialLanguage = SUPPORTED_LANGUAGES.includes(storedLanguage)
    ? storedLanguage
    : DEFAULT_LANGUAGE;

i18n.use(initReactI18next).init({
    resources: {
        en: { translation: en },
        vi: { translation: vi },
    },
    lng: initialLanguage,
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: {
        escapeValue: false,
    },
    keySeparator: false,
    returnNull: false,
});

export function translate(key, options) {
    return i18n.t(key, options);
}

export function getLanguage() {
    return i18n.resolvedLanguage || DEFAULT_LANGUAGE;
}

export function getLocale() {
    return getLanguage() === 'vi' ? 'vi-VN' : 'en-US';
}

export function setLanguage(language) {
    const nextLanguage = SUPPORTED_LANGUAGES.includes(language)
        ? language
        : DEFAULT_LANGUAGE;

    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    window.location.reload();
}

export { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES };
export default i18n;
