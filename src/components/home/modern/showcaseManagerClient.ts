import { setShowcaseIndex, showcaseStore, syncShowcaseProjects } from '@/stores/showcaseStore';

type ShowcaseManagerOptions = {
  total: number;
  colors: (string | undefined)[];
};

declare global {
  interface Window {
    __udixioShowcaseManagerCleanup?: () => void;
    __udixioShowcaseManagerListenersBound?: boolean;
  }
}

const cleanupShowcaseManager = () => {
  window.__udixioShowcaseManagerCleanup?.();
};

const bindCleanupListeners = () => {
  if (window.__udixioShowcaseManagerListenersBound) {
    return;
  }

  document.addEventListener('astro:before-swap', cleanupShowcaseManager);
  window.addEventListener('pagehide', cleanupShowcaseManager);
  window.__udixioShowcaseManagerListenersBound = true;
};

export const startShowcaseManager = ({
  total,
  colors,
}: ShowcaseManagerOptions) => {
  bindCleanupListeners();
  cleanupShowcaseManager();
  syncShowcaseProjects(total, colors);

  const interval = window.setInterval(() => {
    const state = showcaseStore.get();

    if (state.total === 0) return;

    const timeSinceLastInteraction = Date.now() - state.lastInteraction;

    if (
      timeSinceLastInteraction >= 2000 &&
      !state.isHovering &&
      !state.isPastCenter
    ) {
      const nextIndex = state.index + state.step;
      const newIndex = nextIndex >= state.total ? 0 : nextIndex;

      setShowcaseIndex(newIndex, { syncHero: true });
    }
  }, 4000);

  const cleanup = () => {
    window.clearInterval(interval);

    if (window.__udixioShowcaseManagerCleanup === cleanup) {
      delete window.__udixioShowcaseManagerCleanup;
    }
  };

  window.__udixioShowcaseManagerCleanup = cleanup;
};
