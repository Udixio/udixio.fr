import { useState } from "react";
import { Button, Carousel, CarouselItem, IconButton } from "@udixio/ui-react";
import { iArrowRight } from "@udixio/icons-rounded-400/arrow_right";
import type { ProjectProps } from "../../project/Project";

export const ProjectsShowcase = ({
  projects,
}: {
  projects: ProjectProps[];
}) => {
  const total = projects.length + 1; // one for the CTA

  const [index, setIndex] = useState(0);
  const [step, setStep] = useState(1);
  const [visible, setVisible] = useState({ approx: 0, full: 0 });

  const prev = () => setIndex((i) => Math.max(0, i - step));
  const next = () => setIndex((i) => Math.min(total - 1, i + step));

  return (
    <div className="w-full padding">
      <Carousel
        variant="hero"
        scrollSensitivity={0.8}
        index={index}
        onChange={setIndex}
        onMetricsChange={(m) => {
          setStep(m.stepHalf);
          setVisible({ approx: m.visibleApprox, full: m.visibleFull });
        }}
        outputRange={[42, 400]}
        className="h-[500px]"
      >
        {projects.map((project, i) => {
          // Alternate sizes logic for dynamic grid look (optional, but requested in example)
          // The example uses fmt = i % 3 to pick sizes.
          // Since we are rendering cards, we can adapt this or keep standard sizes and let the Carousel handle it.
          // The user's example hardcoded picsum images with sizes.
          // Here we have actual project data.
          // Let's stick to the CarouselItem structure but perhaps standardise aspect ratio or allow variation?
          // The user example used:
          // const fmt = i % 3;
          // const w = fmt === 0 ? 640 : fmt === 1 ? 400 : 240;
          // const h = fmt === 0 ? 240 : fmt === 1 ? 400 : 640;
          // For real projects, we probably want to maintain a consistent card aspect or adapt.
          // Let's assume a standard aspect ratio for now to avoid layout shift with arbitrary project images,
          // OR we can try to mimic the variable aspect ratio if the project images support it.
          // Given most project covers are 16:9, a variable aspect ratio might be tricky without cropping.
          // Let's use a nice consistent standard for now, or a slight variation.

          // To match the requested "Hero" feel, we'll keep the cards relatively consistent but styled nicely.

          return (
            <CarouselItem key={project.slug}>
              <ShowcaseItem project={project} />
            </CarouselItem>
          );
        })}

        {/* CTA Card as last item */}
        <CarouselItem key="cta">
          <div className="h-full flex flex-col justify-center gap-8 p-12 rounded-4xl bg-surface-container hover:bg-surface-container-high transition-colors border border-outline-variant/30 group min-w-[300px] min-h-[400px]">
            <p className="text-headline-small text-on-surface  ">
              Et si le prochain projet, c'était le vôtre ?
            </p>
            <Button
              href="/contact"
              label="Lancer mon projet"
              icon={iArrowRight}
              iconPosition="right"
            />
          </div>
        </CarouselItem>
      </Carousel>

      <div className="max-width padding-x w-full mt-8 flex items-center justify-end gap-3">
        <div className="flex gap-4">
          <Button
            variant="outlined"
            label="Précédent"
            onClick={prev}
            disabled={index === 0}
          />
          <Button
            variant="filled"
            label="Suivant"
            onClick={next}
            disabled={index >= total - 1}
          />
        </div>
      </div>
    </div>
  );
};

const ShowcaseItem = ({ project }: { project: ProjectProps }) => {
  return (
    <a
      href={`/realisations/${project.slug}`}
      className="group relative block w-full h-full rounded-4xl overflow-hidden  "
      style={{ viewTransitionName: `realisation-${project.slug}` }}
    >
      {/* Background Image */}
      <div className="absolute inset-0 bg-surface-container-low animate-pulse" />
      <img
        loading="lazy"
        src={project.images.background.src}
        alt={project.title}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-inverse-surface/80 via-inverse-surface/60 to-transparent" />

      {/* Content */}
      <div className="absolute dark bottom-0 left-0 p-8 w-full text-on-surface">
        <div className="flex justify-between items-end">
          <div className="flex-1">
            <h3 className="text-headline-small md:text-headline-medium  mb-2">
              {project.title}
            </h3>
            <p className="text-body-medium text-on-surface-variant line-clamp-2 max-w-md  transition-colors">
              {project.summary}
            </p>
          </div>
          <IconButton
            icon={iArrowRight}
            variant="outlined"
            label="Voir le projet"
            className="-rotate-45 group-hover:rotate-0 transition-transform duration-300 "
          />
        </div>
      </div>
    </a>
  );
};
