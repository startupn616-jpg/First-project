import { createContext, useContext, useState } from 'react';
import { useT } from '../i18n';

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(
    () => localStorage.getItem('ailand_lang') || 'en'
  );

  const toggleLang = () => {
    const next = lang === 'en' ? 'ta' : 'en';
    setLang(next);
    localStorage.setItem('ailand_lang', next);
  };

  const t = useT(lang);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};
