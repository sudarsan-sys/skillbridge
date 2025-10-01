import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

export type SupportedLanguage = 'en' | 'ta' | 'hi';

export interface LanguageConfig {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  fontFamily?: string;
  fontSize: {
    small: number;
    body: number;
    h1: number;
    h2: number;
  };
  ttsVoice?: string;
}

export const SUPPORTED_LANGUAGES: Record<SupportedLanguage, LanguageConfig> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    fontSize: {
      small: 12,
      body: 16,
      h1: 24,
      h2: 20,
    },
    ttsVoice: 'en-US',
  },
  ta: {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    fontFamily: 'System', // You can add custom Tamil fonts here
    fontSize: {
      small: 14,
      body: 18,
      h1: 26,
      h2: 22,
    },
    ttsVoice: 'ta-IN',
  },
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    fontFamily: 'System', // You can add custom Hindi fonts here
    fontSize: {
      small: 14,
      body: 18,
      h1: 26,
      h2: 22,
    },
    ttsVoice: 'hi-IN',
  },
};

export const LANGUAGE_STORAGE_KEY = 'selectedLanguage';
const TRANSLATION_CACHE_KEY = 'translationCacheV1';

// Basic in-memory cache to reduce repeat lookups in a single session
const memoryCache = new Map<string, string>();

function makeCacheKey(text: string, target: SupportedLanguage) {
  return `${target}::${text}`;
}

export const getStoredLanguage = async (): Promise<SupportedLanguage> => {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && Object.keys(SUPPORTED_LANGUAGES).includes(stored)) {
      return stored as SupportedLanguage;
    }
  } catch (error) {
    console.error('Error getting stored language:', error);
  }
  return 'en'; // Default to English
};

export const setStoredLanguage = async (language: SupportedLanguage): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    console.error('Error storing language:', error);
  }
};

// Load persisted translation cache once per session
let cacheLoaded = false;
async function ensureCacheLoaded() {
  if (cacheLoaded) return;
  try {
    const data = await AsyncStorage.getItem(TRANSLATION_CACHE_KEY);
    if (data) {
      const obj = JSON.parse(data) as Record<string, string>;
      Object.entries(obj).forEach(([k, v]) => memoryCache.set(k, v));
    }
  } catch {}
  cacheLoaded = true;
}

async function persistCache() {
  try {
    const obj: Record<string, string> = {};
    memoryCache.forEach((v, k) => (obj[k] = v));
    await AsyncStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(obj));
  } catch {}
}

// Translate a single string using Google Cloud Translate v2 when API key is provided in app config.
// If no key is provided or request fails, falls back to the original string.
export async function translateText(text: string, target: SupportedLanguage): Promise<string> {
  if (!text || target === 'en') return text;
  await ensureCacheLoaded();
  const key = makeCacheKey(text, target);
  const cached = memoryCache.get(key);
  if (cached) return cached;

  const apiKey: string | undefined = (Constants?.expoConfig as any)?.extra?.GOOGLE_TRANSLATE_API_KEY || (Constants?.manifest as any)?.extra?.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) {
    // No API key; return original text as a safe fallback
    return text;
  }

  try {
    const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, target })
    });
    if (!res.ok) throw new Error(`Translate failed ${res.status}`);
    const json = await res.json();
    const translated = json?.data?.translations?.[0]?.translatedText as string | undefined;
    if (translated) {
      memoryCache.set(key, translated);
      // Fire and forget persist to avoid blocking UI
      persistCache();
      return translated;
    }
  } catch (e) {
    console.warn('translateText failed; falling back to original. Reason:', e);
  }
  return text;
}

export async function translateBatch(texts: string[], target: SupportedLanguage): Promise<string[]> {
  if (!texts.length || target === 'en') return texts;
  await ensureCacheLoaded();
  const apiKey: string | undefined = (Constants?.expoConfig as any)?.extra?.GOOGLE_TRANSLATE_API_KEY || (Constants?.manifest as any)?.extra?.GOOGLE_TRANSLATE_API_KEY;
  // Split into cached and uncached
  const results: string[] = new Array(texts.length);
  const toTranslate: { index: number; text: string }[] = [];
  texts.forEach((t, i) => {
    const key = makeCacheKey(t, target);
    const cached = memoryCache.get(key);
    if (cached) results[i] = cached; else toTranslate.push({ index: i, text: t });
  });
  if (!toTranslate.length || !apiKey) return results.map((r, i) => r ?? texts[i]);
  try {
    const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: toTranslate.map(x => x.text), target })
    });
    if (!res.ok) throw new Error(`Translate batch failed ${res.status}`);
    const json = await res.json();
    const translatedItems: string[] = json?.data?.translations?.map((x: any) => x.translatedText) ?? [];
    toTranslate.forEach((item, idx) => {
      const translated = translatedItems[idx] ?? item.text;
      const key = makeCacheKey(item.text, target);
      memoryCache.set(key, translated);
      results[item.index] = translated;
    });
    persistCache();
  } catch (e) {
    console.warn('translateBatch failed; falling back.', e);
    // Fill any missing with originals
    toTranslate.forEach(item => {
      results[item.index] = item.text;
    });
  }
  return results.map((r, i) => r ?? texts[i]);
}

// Helper to translate a lesson model's display fields
export async function translateLesson<T extends {
  title?: string;
  content?: Array<{ type?: string; text?: string; questionText?: string; options?: Array<{ id: string; text: string }>; explanation?: string }>;
  assessment?: { questions: Array<{ id: string; questionText: string; options: Array<{ id: string; text: string }> }> };
}>(lesson: T, target: SupportedLanguage): Promise<T> {
  if (!lesson || target === 'en') return lesson;
  const texts: string[] = [];
  const locations: Array<{ set: (value: string) => void; original: string }> = [];

  if (lesson.title) {
    locations.push({ original: lesson.title, set: (v) => (lesson.title = v as any) });
    texts.push(lesson.title);
  }
  lesson.content?.forEach((c) => {
    if (c.text) { locations.push({ original: c.text, set: (v) => (c.text = v) }); texts.push(c.text); }
    if (c.questionText) { locations.push({ original: c.questionText, set: (v) => (c.questionText = v) }); texts.push(c.questionText); }
    c.options?.forEach(o => { if (o.text) { locations.push({ original: o.text, set: (v) => (o.text = v) }); texts.push(o.text); } });
    if (c.explanation) { locations.push({ original: c.explanation, set: (v) => (c.explanation = v) }); texts.push(c.explanation); }
  });
  lesson.assessment?.questions.forEach(q => {
    if (q.questionText) { locations.push({ original: q.questionText, set: (v) => (q.questionText = v) }); texts.push(q.questionText); }
    q.options?.forEach(o => { if (o.text) { locations.push({ original: o.text, set: (v) => (o.text = v) }); texts.push(o.text); } });
  });

  const translated = await translateBatch(texts, target);
  translated.forEach((val, idx) => locations[idx].set(val));
  return lesson;
}

// Translation strings
export const translations: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    // Common
    back: 'Back',
    next: 'Next',
    submit: 'Submit',
    loading: 'Loading...',
    error: 'Error',
    lessons: 'Lessons',
    user: 'User',
    badges: 'Badges',
    xp: 'XP',
    streak: 'Streak',
    
    // Language Selection
    selectLanguage: 'Select Language',
    choosePreferredLanguage: 'Choose your preferred language for learning',
    continue: 'Continue',
    settingUp: 'Setting up...',
    changeLanguage: 'Change Language',
    currentLanguageLabel: 'Current Language',
    
    // Lesson Screen
    startAssessment: 'Start Assessment',
    nextLesson: 'Next Lesson',
    assessment: 'Assessment',
    assessmentComplete: 'Assessment Complete!',
    status: 'Status',
    score: 'Score',
    xpEarned: 'XP Earned',
    incomplete: 'Incomplete',
    answerAllQuestions: 'Please answer all questions before submitting.',
    submitAssessment: 'Submit Assessment',
    submitAssessmentFailed: 'Failed to submit assessment.',
    failedToLoadLesson: 'Failed to load lesson.',
    failedToLoadNextLesson: 'Failed to load next lesson.',
    review: 'Review',
    remedialLesson: 'Remedial Lesson',
    lessonNotFound: 'Lesson data not found. Please go back and try again.',
    
    // TTS
    playAudio: 'Play Audio',
    stopAudio: 'Stop Audio',
  },
  ta: {
    // Common
    back: 'பின்',
    next: 'அடுத்து',
    submit: 'சமர்ப்பிக்கவும்',
    loading: 'ஏற்றுகிறது...',
    error: 'பிழை',
    lessons: 'பாடங்கள்',
    user: 'பயனர்',
    badges: 'பதக்கங்கள்',
    xp: 'XP',
    streak: 'தொடர்',
    
    // Language Selection
    selectLanguage: 'மொழியைத் தேர்ந்தெடுக்கவும்',
    choosePreferredLanguage: 'கற்றலுக்கு உங்கள் விருப்பமான மொழியைத் தேர்ந்தெடுக்கவும்',
    continue: 'தொடரவும்',
    settingUp: 'அமைக்கிறது...',
    changeLanguage: 'மொழியை மாற்று',
    currentLanguageLabel: 'தற்போதைய மொழி',
    
    // Lesson Screen
    startAssessment: 'மதிப்பீட்டைத் தொடங்கவும்',
    nextLesson: 'அடுத்த பாடம்',
    assessment: 'மதிப்பீடு',
    assessmentComplete: 'மதிப்பீடு முடிந்தது!',
    status: 'நிலை',
    score: 'மதிப்பெண்',
    xpEarned: 'XP பெற்றது',
    incomplete: 'முழுமையடையாத',
    answerAllQuestions: 'சமர்ப்பிப்பதற்கு முன் அனைத்து கேள்விகளுக்கும் பதிலளிக்கவும்.',
    submitAssessment: 'மதிப்பீட்டைச் சமர்ப்பிக்கவும்',
    submitAssessmentFailed: 'மதிப்பீட்டை சமர்ப்பிக்க முடியவில்லை.',
    failedToLoadLesson: 'பாடத்தை ஏற்ற முடியவில்லை.',
    failedToLoadNextLesson: 'அடுத்த பாடத்தை ஏற்ற முடியவில்லை.',
    review: 'மறுபரிசீலனை',
    remedialLesson: 'திருத்தப் பாடம்',
    lessonNotFound: 'பாட தரவு கிடைக்கவில்லை. தயவுசெய்து திரும்பிச் சென்று மீண்டும் முயற்சிக்கவும்.',
    
    // TTS
    playAudio: 'ஆடியோ இயக்கவும்',
    stopAudio: 'ஆடியோ நிறுத்தவும்',
  },
  hi: {
    // Common
    back: 'वापस',
    next: 'अगला',
    submit: 'जमा करें',
    loading: 'लोड हो रहा है...',
    error: 'त्रुटि',
    lessons: 'पाठ',
    user: 'उपयोगकर्ता',
    badges: 'बैज',
    xp: 'XP',
    streak: 'स्ट्रिक',
    
    // Language Selection
    selectLanguage: 'भाषा चुनें',
    choosePreferredLanguage: 'सीखने के लिए अपनी पसंदीदा भाषा चुनें',
    continue: 'जारी रखें',
    settingUp: 'सेट किया जा रहा है...',
    changeLanguage: 'भाषा बदलें',
    currentLanguageLabel: 'वर्तमान भाषा',
    
    // Lesson Screen
    startAssessment: 'मूल्यांकन शुरू करें',
    nextLesson: 'अगला पाठ',
    assessment: 'मूल्यांकन',
    assessmentComplete: 'मूल्यांकन पूर्ण!',
    status: 'स्थिति',
    score: 'स्कोर',
    xpEarned: 'XP अर्जित',
    incomplete: 'अधूरा',
    answerAllQuestions: 'कृपया जमा करने से पहले सभी प्रश्नों का उत्तर दें।',
    submitAssessment: 'मूल्यांकन जमा करें',
    submitAssessmentFailed: 'मूल्यांकन जमा करने में विफल।',
    failedToLoadLesson: 'पाठ लोड करने में विफल।',
    failedToLoadNextLesson: 'अगला पाठ लोड करने में विफल।',
    review: 'समीक्षा',
    remedialLesson: 'सुधारात्मक पाठ',
    lessonNotFound: 'पाठ डेटा नहीं मिला। कृपया वापस जाकर पुनः प्रयास करें।',
    
    // TTS
    playAudio: 'ऑडियो चलाएं',
    stopAudio: 'ऑडियो रोकें',
  },
};

export const translate = (key: string, language: SupportedLanguage): string => {
  return translations[language]?.[key] || translations.en[key] || key;
};
