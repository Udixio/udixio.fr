import { atom } from 'nanostores';
import config from '../../theme.config';
import { API, type ConfigInterface } from '@udixio/theme';

export const themeConfigStore = atom<ConfigInterface>(config);

export const themeServiceStore = atom<API | null>(null);

// Hex actuellement appliqué au thème (initialisé par ThemeProvider depuis le SSR)
export const currentSourceHexStore = atom<string | undefined>(undefined);
