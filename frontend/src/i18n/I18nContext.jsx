import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import en from './en.js';
import ka from './ka.js';

const dictionaries = { en, ka };
const I18nContext = createContext(null);

function detectLangFromPath(pathname) {
  const seg = pathname.split('/').filter(Boolean)[0];
  if (seg === 'en' || seg === 'ka') return seg;
  return null;
}

export function I18nProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [lang, setLangState] = useState(() => {
    return (
      detectLangFromPath(location.pathname) ||
      localStorage.getItem('bb_lang') ||
      'en'
    );
  });

  useEffect(() => {
    const fromUrl = detectLangFromPath(location.pathname);
    if (fromUrl && fromUrl !== lang) setLangState(fromUrl);
  }, [location.pathname, lang]);

  function setLang(next) {
    localStorage.setItem('bb_lang', next);
    setLangState(next);
    const rest = location.pathname.replace(/^\/(en|ka)(?=\/|$)/, '') || '/';
    navigate('/' + next + (rest === '/' ? '' : rest) + location.search);
  }

  const value = useMemo(() => {
    const dict = dictionaries[lang] || dictionaries.en;
    function t(key, vars) {
      let s = key.split('.').reduce((o, k) => (o ? o[k] : null), dict) ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
      return s;
    }
    return { lang, setLang, t };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useT must be inside <I18nProvider>');
  return ctx;
}
