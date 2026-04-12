import { useEffect, useRef, useState } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { Button, Carousel, CarouselItem, classNames, IconButton } from "@udixio/ui-react";
import { iArrowRight } from "@udixio/icons-rounded-400/arrow_right";
import type { ProjectProps } from "../../project/Project";
import { iArrowLeft } from "@udixio/icons-rounded-400/arrow_left";
import { ShowcaseItem } from "./ShowcaseItem";
import { updateThemeFromHex } from "@/components/ThemeProvider";
import { showcaseStore } from "@/stores/showcaseStore";

export const ProjectsShowcase = ({
  projects,
}: {
  projects: ProjectProps[];
}) => {
  const total = projects.length + 1; // one for the CTA

  const [index, setIndex] = useState(0);
  const [step, setStep] = useState(1);

  const lastInteractionRef = useRef<number>(Date.now());

  // heroIndex : mis à jour uniquement lors de navigations intentionnelles (prev/next/auto-play)
  // Pour le scroll manuel, debounce dans onChange — jamais via l'effet réactif sur index
  const [heroIndex, setHeroIndex] = useState(0);
  const heroTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Pendant une navigation programmatique, on ignore les onChange du carousel (feedback d'animation)
  const isProgrammaticRef = useRef(false);
  const programmaticTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Refs pour lire index/step à jour dans setInterval sans stale closure
  const indexRef = useRef(0);
  const stepRef = useRef(1);
  const PROGRAMMATIC_LOCK = 1000;
  const HERO_DEBOUNCE = 400;

  const carouselRef = useRef<HTMLDivElement>(null);
  // Ref vers le portail hero pour gérer sa visibilité au scroll
  const portalRef = useRef<Element | null>(null);

  useEffect(() => {
    portalRef.current = document.getElementById("showcase-hero-portal");
  }, []);

  useEffect(() => { indexRef.current = index; }, [index]);
  useEffect(() => { stepRef.current = step; }, [step]);

  const [isVisible, setIsVisible] = useState(true);

  const { scrollYProgress } = useScroll({
    target: carouselRef,
    offset: ["start end", "end start"],
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const showHero = latest < 0.05;
    showcaseStore.set({ ...showcaseStore.get(), showHero });
    const nowVisible = latest < 1;
    if (!nowVisible) updateThemeFromHex();
    setIsVisible(nowVisible);
  });

  // Arrête l'auto-play quand le bas du carousel dépasse le centre de l'écran
  const { scrollYProgress: carouselBottomProgress } = useScroll({
    target: carouselRef,
    offset: ["end 0.5", "end start"],
  });
  const isScrolledPastRef = useRef(false);
  useMotionValueEvent(carouselBottomProgress, "change", (latest) => {
    isScrolledPastRef.current = latest > 0;
  });

  useEffect(() => {
    if (!isVisible) return;
    updateThemeFromHex(projects[heroIndex]?.images?.background?.sourceColor);
  }, [heroIndex, isVisible, projects]);

  // Synchronise heroIndex dans le store
  useEffect(() => {
    showcaseStore.set({ ...showcaseStore.get(), heroIndex });
  }, [heroIndex]);

  const goToIndex = (newIndex: number) => {
    isProgrammaticRef.current = true;
    if (programmaticTimerRef.current) clearTimeout(programmaticTimerRef.current);
    programmaticTimerRef.current = setTimeout(() => {
      isProgrammaticRef.current = false;
    }, PROGRAMMATIC_LOCK);
    setIndex(newIndex);
    setHeroIndex(Math.min(projects.length - 1, newIndex));
  };

  const prev = () => {
    lastInteractionRef.current = Date.now();
    goToIndex(Math.max(0, index - step));
  };
  const next = () => {
    lastInteractionRef.current = Date.now();
    goToIndex(Math.min(projects.length - 1, index + step));
  };

  useEffect(() => {
    const interval = window.setInterval(() => {
      const timeSinceLastInteraction = Date.now() - lastInteractionRef.current;
      const { isHovering } = showcaseStore.get();
      if (timeSinceLastInteraction >= 2000 && !isHovering && !isScrolledPastRef.current) {
        const nextIndex = indexRef.current + stepRef.current;
        goToIndex(nextIndex >= total ? 0 : nextIndex);
      }
    }, 4000);
    return () => window.clearInterval(interval);
  }, [total]);

  return (
    <div className="w-full">
      <div
        ref={carouselRef}
        className="group"
        onMouseEnter={() => showcaseStore.set({ ...showcaseStore.get(), isHovering: true })}
        onMouseLeave={() => showcaseStore.set({ ...showcaseStore.get(), isHovering: false })}
      >
        <Carousel
          variant="hero"
          scrollSensitivity={0.8}
          index={index}
          onChange={(newIndex) => {
            if (isProgrammaticRef.current) return;
            lastInteractionRef.current = Date.now();
            setIndex(newIndex);
            if (heroTimerRef.current) clearTimeout(heroTimerRef.current);
            heroTimerRef.current = setTimeout(() => {
              setHeroIndex(newIndex);
            }, HERO_DEBOUNCE);
          }}
          onMetricsChange={(m) => {
            setStep(m.stepHalf);
          }}
          outputRange={[100, 600]}
          className="h-[500px]"
        >
          {projects.map((project) => {
            const isActive = project.slug === projects[index]?.slug;

            return (
              <CarouselItem key={project.slug}>
                <div
                  className={classNames(
                    "w-full h-full transition-all duration-700",
                    "group-hover:grayscale-70 group-hover:opacity-80",
                    "hover:grayscale-0 hover:opacity-100",
                    { "grayscale-70 opacity-80": !isActive },
                  )}
                >
                  <ShowcaseItem project={project} />
                </div>
              </CarouselItem>
            );
          })}
        </Carousel>
      </div>

      <div className="w-full mt-8 flex items-center justify-end gap-3">
        <Button
          href="/realisations"
          label="Voir nos réalisations"
          variant="text"
        />
        <IconButton
          variant="outlined"
          label="Précédent"
          icon={iArrowLeft}
          onClick={prev}
          disabled={index === 0}
        />
        <IconButton
          variant="tonal"
          label="Suivant"
          icon={iArrowRight}
          onClick={next}
          disabled={index >= projects.length - 1}
        />
      </div>
    </div>
  );
};
