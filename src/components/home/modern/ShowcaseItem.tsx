import { IconButton } from "@udixio/ui-react";
import { iArrowRight } from "@udixio/icons-rounded-400/arrow_right";
import type { ProjectProps } from "@/components/project/Project";

export const ShowcaseItem = ({
  project,
  eager,
}: {
  project: ProjectProps;
  eager?: boolean;
}) => {
  return (
    <a
      href={`/realisations/${project.slug}`}
      className="group/showcase relative block w-full h-full rounded-4xl overflow-hidden"
      style={{ viewTransitionName: `realisation-${project.slug}` }}
    >
      <div className="absolute inset-0 bg-surface-container-low animate-pulse" />
      <img
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
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
