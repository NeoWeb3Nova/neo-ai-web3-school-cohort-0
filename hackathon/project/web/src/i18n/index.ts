import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import zh from './locales/zh.json';

const resources = {
  en: { translation: en },
  zh: { translation: zh },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

/* Sync <html lang> with i18n so CSS :lang() / [lang] selectors work */
function syncDocumentLang(lng: string) {
  document.documentElement.setAttribute('lang', lng);
}

// Set initial lang after init
syncDocumentLang(i18n.language || 'en');

// Keep in sync on every change
i18n.on('languageChanged', syncDocumentLang);

export default i18n;
