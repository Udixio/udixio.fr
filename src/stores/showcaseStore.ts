import { atom } from 'nanostores';
import { updateThemeFromHex } from '@/components/ThemeProvider';

export type ShowcaseState = {
  index: number;
  step: number;
  heroIndex: number;
  showHero: boolean;
  isPastCenter: boolean;
  isHovering: boolean;
  lastInteraction: number;
  total: number;
  colors: (string | undefined)[];
  isVisible: boolean;
};

const initialShowcaseState: ShowcaseState = {
  index: 0,
  step: 1,
  heroIndex: 0,
  showHero: true,
  isPastCenter: false,
  isHovering: false,
  lastInteraction: Date.now(),
  total: 0,
  colors: [],
  isVisible: true,
};

export const showcaseStore = atom<ShowcaseState>(initialShowcaseState);

const clampIndex = (index: number, total: number) => {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(index, total - 1));
};

const areColorsEqual = (
  left: (string | undefined)[],
  right: (string | undefined)[],
) => {
  if (left.length !== right.length) return false;

  return left.every((color, index) => color === right[index]);
};

const setShowcaseState = (
  updater:
    | Partial<ShowcaseState>
    | ((state: ShowcaseState) => Partial<ShowcaseState>),
) => {
  const currentState = showcaseStore.get();
  const patch =
    typeof updater === 'function' ? updater(currentState) : updater;

  const patchEntries = Object.entries(patch) as [
    keyof ShowcaseState,
    ShowcaseState[keyof ShowcaseState],
  ][];

  if (
    patchEntries.length === 0 ||
    patchEntries.every(([key, value]) => currentState[key] === value)
  ) {
    return;
  }

  showcaseStore.set({
    ...currentState,
    ...patch,
  });
};

export const syncShowcaseProjects = (
  total: number,
  colors: (string | undefined)[],
) => {
  const nextTotal = Math.max(total, 0);

  setShowcaseState((state) => {
    const nextIndex = clampIndex(state.index, nextTotal);
    const nextHeroIndex = clampIndex(state.heroIndex, nextTotal);
    const patch: Partial<ShowcaseState> = {};

    if (state.total !== nextTotal) {
      patch.total = nextTotal;
    }

    if (!areColorsEqual(state.colors, colors)) {
      patch.colors = colors;
    }

    if (state.index !== nextIndex) {
      patch.index = nextIndex;
    }

    if (state.heroIndex !== nextHeroIndex) {
      patch.heroIndex = nextHeroIndex;
    }

    return patch;
  });
};

export const setShowcaseIndex = (
  nextIndex: number,
  options: {
    syncHero?: boolean;
    markInteraction?: boolean;
    total?: number;
  } = {},
) => {
  setShowcaseState((state) => {
    const total = options.total ?? state.total;
    const clampedIndex = clampIndex(nextIndex, total);
    const patch: Partial<ShowcaseState> = {};

    if (state.index !== clampedIndex) {
      patch.index = clampedIndex;
    }

    if (options.syncHero && state.heroIndex !== clampedIndex) {
      patch.heroIndex = clampedIndex;
    }

    if (options.markInteraction) {
      patch.lastInteraction = Date.now();
    }

    return patch;
  });
};

export const setShowcaseHeroIndex = (nextHeroIndex: number, total?: number) => {
  setShowcaseState((state) => ({
    heroIndex: clampIndex(nextHeroIndex, total ?? state.total),
  }));
};

export const setShowcaseHovering = (isHovering: boolean) => {
  setShowcaseState({ isHovering });
};

export const setShowcaseStep = (step: number) => {
  setShowcaseState({ step });
};

export const setShowcaseScrollState = ({
  showHero,
  isVisible,
}: Pick<ShowcaseState, 'showHero' | 'isVisible'>) => {
  setShowcaseState((state) => {
    const patch: Partial<ShowcaseState> = {};

    if (state.showHero !== showHero) {
      patch.showHero = showHero;
    }

    if (state.isVisible !== isVisible) {
      patch.isVisible = isVisible;
    }

    return patch;
  });
};

export const setShowcaseAutoPlayState = (isPastCenter: boolean) => {
  setShowcaseState({ isPastCenter });
};

showcaseStore.listen((state, oldState) => {
  if (
    state.index === oldState?.index &&
    state.isVisible === oldState?.isVisible &&
    state.colors === oldState?.colors
  ) {
    return;
  }

  if (!state.isVisible) {
    updateThemeFromHex(null);
    return;
  }

  const color = state.colors[state.index];

  if (color) {
    updateThemeFromHex(color);
  }
});
