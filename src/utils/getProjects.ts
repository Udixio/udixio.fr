import { getCollection } from "astro:content";
import { getImage } from "astro:assets";
import type { ProjectProps } from "@/components/project/Project";

export const getProjects = async (max?: number): Promise<ProjectProps[]> => {
  const realisations = await getCollection("realisation");
  realisations.sort(
    (a, b) => (a.data.order ?? Infinity) - (b.data.order ?? Infinity)
  );

  const renders = import.meta.glob("@assets/renders/*.webp", { eager: true });
  const backgrounds = import.meta.glob("@assets/backgrounds/*.webp", { eager: true });

  const projectsProps: ProjectProps[] = await Promise.all(
    realisations.map(async (realisation) => {
      const bg = realisation.data.images.background;
      const slug = realisation.id;

      const bgEntry =
        (
          Object.entries(backgrounds).find(([path]) =>
            path.endsWith(`${slug}-background.webp`)
          )?.[1] as any
        )?.default ??
        (
          Object.entries(renders).find(([path]) =>
            path.endsWith(`${slug}.webp`)
          )?.[1] as any
        )?.default;

      const resolvedSrc = bgEntry
        ? (
            await getImage({
              src: bgEntry,
              format: "webp",
              width: max ? 1200 : 1800,
            })
          ).src
        : (bg?.src ?? "");

      const p: ProjectProps = {
        slug,
        ...realisation.data,
        images: {
          ...realisation.data.images,
          background: {
            ...bg,
            src: resolvedSrc,
            alt: bg?.alt ?? "",
          },
        },
      };
      
      return p;
    })
  );

  return max ? projectsProps.slice(0, max) : projectsProps;
};
