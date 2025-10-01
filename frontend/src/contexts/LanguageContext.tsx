import React, { createContext, useContext, useEffect, useState } from 'react';
import { getStoredLanguage, setStoredLanguage, SupportedLanguage, SUPPORTED_LANGUAGES, translate } from '../lib/language';

interface LanguageContextType {
  currentLanguage: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => Promise<void>;
  t: (key: string) => string;
  languageConfig: typeof SUPPORTED_LANGUAGES[SupportedLanguage];
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: React.ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('en');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const storedLanguage = await getStoredLanguage();
        setCurrentLanguage(storedLanguage);
      } catch (error) {
        console.error('Error loading language:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLanguage();
  }, []);

  const setLanguage = async (language: SupportedLanguage) => {
    try {
      await setStoredLanguage(language);
      setCurrentLanguage(language);
    } catch (error) {
      console.error('Error setting language:', error);
    }
  };

  const t = (key: string) => translate(key, currentLanguage);

  const languageConfig = SUPPORTED_LANGUAGES[currentLanguage];

  const value: LanguageContextType = {
    currentLanguage,
    setLanguage,
    t,
    languageConfig,
    isLoading,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
