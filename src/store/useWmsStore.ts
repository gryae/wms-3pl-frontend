import { create } from 'zustand';
import en from '../locales/en.json';
import id from '../locales/id.json';

const dictionaries = { EN: en, ID: id };

export type Language = 'EN' | 'ID';
export type Theme = 'light' | 'dark';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  sellerId?: string | null;
}

interface WmsState {
  token: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  language: Language;
  theme: Theme;
  
  // Auth actions
  setAuth: (user: UserProfile, token: string, refreshToken: string) => void;
  logout: () => void;
  
  // Preference actions
  setLanguage: (lang: Language) => void;
  toggleTheme: () => void;
  initPreferences: () => void;
  
  // Localization translator
  t: (path: string) => string;
}

export const useWmsStore = create<WmsState>((set, get) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('wms_token') : null,
  refreshToken: typeof window !== 'undefined' ? localStorage.getItem('wms_refresh_token') : null,
  user: typeof window !== 'undefined' && localStorage.getItem('wms_user')
    ? JSON.parse(localStorage.getItem('wms_user') as string)
    : null,
  language: 'EN',
  theme: 'light',

  setAuth: (user, token, refreshToken) => {
    localStorage.setItem('wms_token', token);
    localStorage.setItem('wms_refresh_token', refreshToken);
    localStorage.setItem('wms_user', JSON.stringify(user));
    set({ user, token, refreshToken });
  },

  logout: () => {
    localStorage.removeItem('wms_token');
    localStorage.removeItem('wms_refresh_token');
    localStorage.removeItem('wms_user');
    set({ user: null, token: null, refreshToken: null });
  },

  setLanguage: (language) => {
    localStorage.setItem('wms_lang', language);
    set({ language });
  },

  toggleTheme: () => {
    const nextTheme = get().theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('wms_theme', nextTheme);
    
    if (typeof document !== 'undefined') {
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    set({ theme: nextTheme });
  },

  initPreferences: () => {
    if (typeof window === 'undefined') return;
    
    // Theme init
    const savedTheme = localStorage.getItem('wms_theme') as Theme || 'light';
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Language init
    const savedLang = localStorage.getItem('wms_lang') as Language || 'EN';
    
    set({ theme: savedTheme, language: savedLang });
  },

  t: (path: string) => {
    const lang = get().language;
    const dict = dictionaries[lang];
    
    const keys = path.split('.');
    let current: any = dict;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return path; // Fallback to key path if translation missing
      }
    }
    
    return typeof current === 'string' ? current : path;
  }
}));
