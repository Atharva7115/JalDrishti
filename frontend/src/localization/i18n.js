import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({ resources: { en: { translation: { appName: 'JalDrishti' } }, hi: { translation: { appName: 'जलदृष्टि' } }, mr: { translation: { appName: 'जलदृष्टी' } } }, lng: 'en', fallbackLng: 'en', interpolation: { escapeValue: false } });
export default i18n;
