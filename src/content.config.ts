import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders'

const project = defineCollection({
    loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: "./src/data/project" }),
    schema: z.object({
        title: z.string(),
        description: z.string(),
        theme: z.object({
            isDark: z.boolean(),
            source: z.string(),
        }),
        image: z.object({
            src: z.string(),
            alt: z.string(),
        }),
    }),
});

export const collections = { project };