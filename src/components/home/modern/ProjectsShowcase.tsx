import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { Button, Carousel, CarouselItem, classNames, IconButton } from "@udixio/ui-react";
import { iArrowRight } from "@udixio/icons-rounded-400/arrow_right";
import type { ProjectProps } from "../../project/Project";
import { iArrowLeft } from "@udixio/icons-rounded-400/arrow_left";
import { Card } from "@/components/Card";
import { FastAverageColor } from "fast-average-color";
import { updateThemeFromHex } from "@/components/ThemeProvider";

export const ProjectsShowcase = ({
  projects,
}: {
  projects: ProjectProps[];
}) => {
  const total = projects.length + 1; // one for the CTA

  const [index, setIndex] = useState(0);
  const [step, setStep] = useState(1);
  const [visible, setVisible] = useState({ approx: 0, full: 0 });

  const lastInteractionRef = useRef<number>(Date.now());
  const isHoveringRef = useRef(false);

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

  const [portalTarget, setPortalTarget] = useState<Element | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPortalTarget(document.getElementById("showcase-hero-portal"));
  }, []);

  useEffect(() => { indexRef.current = index; }, [index]);
  useEffect(() => { stepRef.current = step; }, [step]);

  const [fac] = useState(() =>
    typeof window !== "undefined" ? new FastAverageColor() : null,
  );
  const [showHero, setShowHero] = useState(true);
  const [isVisible, setIsVisible] = useState(true);

  const { scrollYProgress } = useScroll({
    target: carouselRef,
    offset: ["start end", "end start"],
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    setShowHero(latest < 0.05);
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
    const currentProject = projects[heroIndex];
    if (fac && currentProject?.images?.background?.src) {
      fac
        .getColorAsync(currentProject.images.background.src, {
          crossOrigin: "anonymous",
        })
        .then((color) => updateThemeFromHex(color.hex))
        .catch(() => {});
    }
  }, [heroIndex, isVisible, projects, fac]);

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
      if (timeSinceLastInteraction >= 2000 && !isHoveringRef.current && !isScrolledPastRef.current) {
        const nextIndex = indexRef.current + stepRef.current;
        goToIndex(nextIndex >= total ? 0 : nextIndex);
      }
    }, 4000);
    return () => window.clearInterval(interval);
  }, [total]);

  const heroPortal = portalTarget
    ? createPortal(
        <AnimatePresence>
          {showHero && projects[heroIndex] && (
            <motion.div
              key="hero-portal-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="ml-auto w-6/10 p-0 h-[175%] pointer-events-auto"
              onMouseEnter={() => { isHoveringRef.current = true; }}
              onMouseLeave={() => { isHoveringRef.current = false; }}
            >
              <Card
                variant="elevated"
                className="w-full h-full p-0 relative overflow-hidden"
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={projects[heroIndex].slug}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                    className="absolute inset-0"
                  >
                    <ShowcaseItem project={projects[heroIndex]} eager />
                  </motion.div>
                </AnimatePresence>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>,
        portalTarget,
      )
    : null;

  return (
    <div className="w-full">
      {heroPortal}
      <div
        ref={carouselRef}
        className="group"
        onMouseEnter={() => { isHoveringRef.current = true; }}
        onMouseLeave={() => { isHoveringRef.current = false; }}
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
            setVisible({ approx: m.visibleApprox, full: m.visibleFull });
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

const ShowcaseItem = ({ project, eager }: { project: ProjectProps; eager?: boolean }) => {
  return (
    <a
      href={`/realisations/${project.slug}`}
      className="group/showcase relative block w-full h-full rounded-4xl overflow-hidden"
      style={{ viewTransitionName: `realisation-${project.slug}` }}
    >
      <div className="absolute inset-0 bg-surface-container-low animate-pulse" />
      <img
        loading={eager ? "eager" : "lazy"}
        src={project.images.background.src}
        alt={project.title}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/showcase:scale-105"
      />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-inverse-surface/80 via-inverse-surface/60 to-transparent" />
      <div className="absolute dark bottom-0 left-0 p-8 w-full text-on-surface">
        <div className="flex justify-between items-end">
          <div className="flex-1">
            <h3 className="text-headline-small md:text-headline-medium mb-2">
              {project.title}
            </h3>
            <p className="text-body-medium text-on-surface-variant line-clamp-2 max-w-md transition-colors">
              {project.summary}
            </p>
          </div>
          <IconButton
            icon={iArrowRight}
            variant="outlined"
            label="Voir le projet"
            className="-rotate-45 group-hover/showcase:rotate-0 transition-transform duration-300"
          />
        </div>
      </div>
    </a>
  );
};
