import { Button, Card, classNames, Divider, IconButton } from "@udixio/ui-react";
import { iArrowRight } from "@udixio/icons-rounded-400/arrow_right";
import { iLink } from "@udixio/icons-rounded-400/link";
import { iClose } from "@udixio/icons-rounded-400/close";
import type { CollectionEntry } from "astro:content";
import type { ReactNode } from "react";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

export type ProjectProps = CollectionEntry<"realisation">["data"] & {
  slug: string;
  images: {
    background: {
      src: string;
      frameSrc?: string;
    };
  };
  technologies?: ReactNode;
  services?: ReactNode;
  metrics?: { label: string; value: string }[];
  body?: ReactNode;
  sidebar?: ReactNode;
  testimonial?: ReactNode;
  view?: "mini" | "full";
};

export const Project = (props: ProjectProps) => {
  const [isHovered, setHovered] = useState(false);

  const {
    slug,
    images,
    title,
    services,
    technologies,
    website,
    summary,
    sidebar,
    body,
    view = "full",
  } = props;
  return (
    <Card
      variant={"filled"}
      interactive={view == "mini"}
      className={classNames({
        " flex flex-col h-full group bg-surface/60 backdrop-blur transition-all duration-300 !rounded-2xl":
          view == "mini",
        "!rounded-[28px] !overflow-auto max-width w-full bg-surface-container-lowest":
          view == "full",
      })}
      style={{ viewTransitionName: "realisation-" + slug }}
      onMouseOver={(e) => {
        setHovered(true);
      }}
      onMouseOut={(e) => {
        setHovered(false);
      }}
    >
      {view == "full" && <ProjectFull {...props} />}
      {view == "mini" && <ProjectMini {...props} isHovered={isHovered} />}
    </Card>
  );
};

export const ProjectMini = ({
  slug,
  images,
  title,
  summary,
  isHovered,
}: ProjectProps & { isHovered: boolean }) => {
  return (
    <>
      <div className="w-full flex-1 rounded-2xl overflow-hidden relative bg-surface">
        <img
          loading="lazy"
          className={classNames(
            "w-full h-full aspect-video group-hover:scale-[1.1] object-cover duration-700 transition-all ",
            {
              "scale-[1.1] opacity-70": isHovered,
            },
          )}
          src={images.background.src}
          height="1920"
          width="1080"
          alt={"Illustration d'un projet"}
        />
        {images.background.frameSrc && (
          <img
            src={images.background.frameSrc}
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-fill pointer-events-none"
          />
        )}
      </div>
      <div
        className={classNames(
          "p-4 gap-4 lg:absolute backdrop-blur bottom-0  transition-all duration-300 w-full",
          " bg-surface/70",
          " group-hover:bg-surface/80",
        )}
      >
        <div className="flex-1">
          <p className="text-title-large">{title}</p>
          <p
            style={{ viewTransitionName: "realisation-summary-" + slug }}
            className="text-title-small mt-2 transition-all  duration-300"
          >
            {summary}
          </p>
        </div>
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{
                opacity: 0,
                height: 0,
                marginTop: 0,
              }}
              animate={{
                opacity: 1,
                height: "auto",
                marginTop: 6 * 4,
              }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Button
                iconPosition="right"
                icon={iArrowRight}
                size={"small"}
                label="Découvrir"
                className={classNames(
                  "transition-all duration-300 hover:gap-4",
                )}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export const ProjectFull = ({
  slug,
  images,
  title,
  summary,
  services,
  technologies,
  metrics,
  body,
  sidebar,
  website,
  testimonial,
  challenge,
}: ProjectProps) => {
  return (
    <>
      <IconButton
        variant="outlined"
        icon={iClose}
        className="block !absolute z-10 w-fit  ml-auto right-0 m-4 top-4 primary"
        label="retour aux projets"
        onClick={() => {
          const referrer = document.referrer;
          const currentDomain = window.location.origin;

          if (referrer && referrer.startsWith(currentDomain)) {
            window.history.back();
          } else {
            window.location.href = "/realisations";
          }
        }}
      />

      {/* Hero */}
      <div className={" w-full h-full"}>
        <div className="min-h-[70vh] relative flex flex-col justify-end items-start pb-16 px-8 md:px-16">
          <div
            className={
              "absolute top-0 left-0 flex items-center w-full h-full"
            }
          >
            <img
              style={{
                maskImage:
                  "linear-gradient(180deg,rgba(0,0,0,0.6) 0%,rgba(0,0,0,0.3) 60%,rgba(0,0,0,0))",
              }}
              className={"w-full object-cover h-full"}
              src={images.background.src}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-transparent to-surface-container-lowest" />
          </div>

          {/* Logo ou titre */}
          <div className="z-10 max-w-screen-md">
            {images.logo?.src && (
              <img className={"mb-6 max-h-16 w-auto"} src={images.logo.src} />
            )}
            {!images.logo?.src && (
              <p
                className={
                  "text-display-medium font-bold mb-4 transition-all duration-300"
                }
              >
                {title}
              </p>
            )}
            <p
              style={{ viewTransitionName: "realisation-summary-" + slug }}
              className={"text-headline-small text-on-surface-variant max-w-xl"}
            >
              {summary}
            </p>
          </div>
        </div>

        {/* Métriques clés — bandeau immédiatement visible */}
        {metrics && metrics.length > 0 && (
          <div className="border-y border-outline-variant/20 bg-surface-container/40 backdrop-blur">
            <div className="max-w-screen-lg mx-auto px-8 py-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-px">
              {metrics.map((m, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center text-center px-6 py-4"
                >
                  <span className="text-display-small font-bold text-primary leading-none">
                    {m.value}
                  </span>
                  <span className="text-label-medium text-on-surface-variant uppercase tracking-widest mt-2">
                    {m.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Corps principal */}
        <div className={"flex mt-0 h-full gap-0"}>
          {/* Sidebar */}
          <div className={"left w-fit !max-w-sm padding-x pt-12"}>
            <div className="prose-markdown">{sidebar}</div>
            <div className="flex flex-col gap-10 mt-4">
              {services && (
                <div>
                  <p className="text-label-large uppercase tracking-widest text-on-surface-variant mb-3">
                    Services
                  </p>
                  <div className="flex flex-wrap gap-2">{services}</div>
                </div>
              )}
              {technologies && (
                <div>
                  <p className="text-label-large uppercase tracking-widest text-on-surface-variant mb-3">
                    Technologies
                  </p>
                  <div className="flex flex-wrap gap-2">{technologies}</div>
                </div>
              )}
              {website && (
                <Button
                  className="w-fit"
                  href={website}
                  icon={iLink}
                  label={"Visiter le site"}
                />
              )}
            </div>
          </div>

          <Divider orientation={"vertical"} />

          {/* Contenu principal */}
          <div className={"flex-1 right padding-x pb-16 pt-12"}>
            {/* Challenge */}
            {challenge && (
              <div className="mb-10 px-4">
                <p className="text-label-large uppercase tracking-widest text-on-surface-variant mb-3">
                  Le défi
                </p>
                <p className="text-body-large text-on-surface leading-relaxed">
                  {challenge}
                </p>
              </div>
            )}

            {/* Body (solution + contexte) */}
            <div className={"prose-markdown px-4"}>{body}</div>

            {/* Aperçu vidéo */}
            {website && (
              <>
                <h2 className={"uppercase px-4 mt-12"}>Aperçu du site</h2>
                <video
                  className={"w-full mt-4 rounded-2xl"}
                  autoPlay
                  muted
                  loop
                  playsInline
                >
                  <source
                    src={"/videos/renders/" + slug + "-720.webm"}
                    type="video/webm"
                  />
                  Votre navigateur ne supporte pas l'élément vidéo.
                </video>
              </>
            )}

            {/* Témoignage */}
            {testimonial && (
              <div className="mt-16 px-4">
                <p className="text-label-large uppercase tracking-widest text-on-surface-variant mb-6">
                  Témoignage client
                </p>
                <div className="relative bg-primary/5 border border-primary/15 rounded-2xl p-8 overflow-hidden">
                  <div className="absolute top-4 right-6 opacity-10">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" className="text-primary">
                      <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/>
                    </svg>
                  </div>
                  {testimonial}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
