import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './en.json';
import ne from './ne.json';

export type AppLanguage = 'ne' | 'en';

const LANG_KEY = 'headtrack.language';

/**
 * Nepali is the default language for the study population; English is
 * available from onboarding and Settings. The choice persists locally and
 * applies instantly (no restart), per Section 7 of the technical proposal.
 */
export async function initI18n(): Promise<void> {
  const stored = (await AsyncStorage.getItem(LANG_KEY)) as AppLanguage | null;
  await i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      ne: { translation: ne },
    },
    lng: stored ?? 'ne',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnObjects: true,
  });
}

export async function setLanguage(lang: AppLanguage): Promise<void> {
  await i18n.changeLanguage(lang);
  await AsyncStorage.setItem(LANG_KEY, lang);
}

export function currentLanguage(): AppLanguage {
  return (i18n.language as AppLanguage) ?? 'ne';
}

export default i18n;
