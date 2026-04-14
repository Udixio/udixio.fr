import { useEffect, useRef } from "react";
import {
  setShowcaseIndex,
  showcaseStore,
  syncShowcaseProjects,
} from "@/stores/showcaseStore";

export const ShowcaseManager = ({
  total,
  colors,
}: {
  total: number;
  colors: (string | undefined)[];
}) => {
  const colorsKey = JSON.stringify(colors);
  const colorsRef = useRef(colors);

  colorsRef.current = colors;

  useEffect(() => {
    syncShowcaseProjects(total, colorsRef.current);

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

    return () => window.clearInterval(interval);
  }, [colorsKey, total]);

  return null;
};
