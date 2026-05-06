import { useCallback } from 'react';

import { useLanguage } from '@/features/i18n/LanguageContext';
import { translations } from '@/features/i18n/translations';

export function useTranslation() {
  const { language, setLanguage } = useLanguage();

  const t = useCallback(
    (key: string) => {
      return translations[language]?.[key] ?? translations['en']?.[key] ?? key;
    },
    [language]
  );

  return { t, language, setLanguage };
}
