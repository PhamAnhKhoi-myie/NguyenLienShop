import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import vi from './locales/vi.json';

const LANGUAGE_STORAGE_KEY = 'app_language';
const DEFAULT_LANGUAGE = 'vi';
const SUPPORTED_LANGUAGES = ['en', 'vi'];

function detectInitialLanguage() {
    const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);

    if (SUPPORTED_LANGUAGES.includes(storedLanguage)) {
        return storedLanguage;
    }

    const browserLanguages =
        navigator.languages?.length > 0
            ? navigator.languages
            : [navigator.language];
    const prefersVietnamese = browserLanguages.some((language) =>
        language?.toLowerCase().startsWith('vi')
    );

    return prefersVietnamese ? 'vi' : DEFAULT_LANGUAGE;
}

const initialLanguage = detectInitialLanguage();

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
