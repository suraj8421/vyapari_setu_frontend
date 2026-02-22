// ============================================
// i18n Configuration (English + Hindi)
// ============================================

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en';
import hi from './locales/hi';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en,
            hi,
        },
        fallbackLng: 'en',
        debug: false,
        interpolation: {
            escapeValue: false, // React already handles XSS
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
        },
    });

export default i18n;
