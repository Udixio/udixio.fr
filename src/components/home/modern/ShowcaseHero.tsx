import { useStore } from "@nanostores/react";
import { AnimatePresence, motion } from "motion/react";
import { Card } from "@/components/Card";
import { ShowcaseItem } from "./ShowcaseItem";
import { setShowcaseHovering, showcaseStore } from "@/stores/showcaseStore";
import type { ProjectProps } from "@/components/project/Project";

export const ShowcaseHero = ({ projects }: { projects: ProjectProps[] }) => {
  const { heroIndex, showHero } = useStore(showcaseStore);

  const setHovering = (value: boolean) => {
    setShowcaseHovering(value);
  };

  return (
    <AnimatePresence initial={false}>
      {showHero && projects[heroIndex] && (
        <motion.div
          key="hero-portal-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="ml-auto w-6/10 p-0 h-[175%] pointer-events-auto"
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
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
    </AnimatePresence>
  );
};
