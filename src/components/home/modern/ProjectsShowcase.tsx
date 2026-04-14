import { useEffect, useRef } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { Button, Carousel, CarouselItem, classNames, IconButton } from "@udixio/ui-react";
import type { ProjectProps } from "../../project/Project";
import { ShowcaseItem } from "./ShowcaseItem";
import {
  setShowcaseAutoPlayState,
  setShowcaseHeroIndex,
  setShowcaseHovering,
  setShowcaseIndex,
  setShowcaseScrollState,
  setShowcaseStep,
  showcaseStore,
} from "@/stores/showcaseStore";
import { iChevronRight } from "@udixio/icons-rounded-400/chevron_right";
import { iChevronLeft } from "@udixio/icons-rounded-400/chevron_left";
import { useStore } from "@nanostores/react";

export const ProjectsShowcase = ({
  projects,
}: {
  projects: ProjectProps[];
}) => {
  const { index } = useStore(showcaseStore);

  const heroTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pendant une navigation programmatique, on ignore les onChange du carousel (feedback d'animation)
  const isProgrammaticRef = useRef(false);
  const programmaticTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const PROGRAMMATIC_LOCK = 1000;
  const HERO_DEBOUNCE = 400;

  const carouselRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: carouselRef,
    offset: ["start end", "end start"],
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    setShowcaseScrollState({
      showHero: latest < 0.05,
      isVisible: latest < 1,
    });
  });

  // Arrête l'auto-play quand le bas du carousel dépasse le centre de l'écran
  const { scrollYProgress: carouselBottomProgress } = useScroll({
    target: carouselRef,
    offset: ["end 0.5", "end start"],
  });

  useMotionValueEvent(carouselBottomProgress, "change", (latest) => {
    setShowcaseAutoPlayState(latest > 0);
  });

  useEffect(() => {
    return () => {
      if (heroTimerRef.current) clearTimeout(heroTimerRef.current);
      if (programmaticTimerRef.current) clearTimeout(programmaticTimerRef.current);
    };
  }, []);

  const goToIndex = (newIndex: number) => {
    isProgrammaticRef.current = true;
    if (programmaticTimerRef.current)
      clearTimeout(programmaticTimerRef.current);
    programmaticTimerRef.current = setTimeout(() => {
      isProgrammaticRef.current = false;
    }, PROGRAMMATIC_LOCK);

    setShowcaseIndex(newIndex, {
      syncHero: true,
      markInteraction: true,
      total: projects.length,
    });
  };

  const prev = () => {
    const { step } = showcaseStore.get();
    goToIndex(Math.max(0, index - step));
  };
  const next = () => {
    const { step } = showcaseStore.get();
    goToIndex(Math.min(projects.length - 1, index + step));
  };

  return (
    <div className="w-full">
      <div
        ref={carouselRef}
        className="group"
        onMouseEnter={() => {
          setShowcaseHovering(true);
        }}
        onMouseLeave={() => {
          setShowcaseHovering(false);
        }}
      >
        <Carousel
          variant="hero"
          scrollSensitivity={0.8}
          index={index}
          onChange={(newIndex) => {
            if (isProgrammaticRef.current) return;
            const state = showcaseStore.get();
            if (state.index === newIndex) return;

            setShowcaseIndex(newIndex, {
              markInteraction: true,
              total: projects.length,
            });

            if (heroTimerRef.current) clearTimeout(heroTimerRef.current);
            heroTimerRef.current = setTimeout(() => {
              setShowcaseHeroIndex(newIndex, projects.length);
            }, HERO_DEBOUNCE);
          }}
          onMetricsChange={(m) => {
            setShowcaseStep(m.stepHalf);
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
        <div className="flex items-center gap-2 bg-surface-container-low rounded-full p-1">
          <IconButton
            width={"wide"}
            variant="standard"
            label="Précédent"
            icon={iChevronLeft}
            onClick={prev}
            disabled={index === 0}
          />
          <IconButton
            width={"wide"}
            variant="standard"
            label="Suivant"
            icon={iChevronRight}
            onClick={next}
            disabled={index >= projects.length - 1}
          />
        </div>
      </div>
    </div>
  );
};
