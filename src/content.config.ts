import {defineCollection, z} from 'astro:content';
import {glob} from 'astro/loaders'

const realisation = defineCollection({
    loader: glob({pattern: '**/[^_]*.{md,mdx}', base: "./src/data/realisation"}),
    schema: z.object({
        title: z.string(),
        description: z.string(),
        order: z.number().optional(),
        theme: z.object({
            isDark: z.boolean(),
            source: z.string(),
        }),
        images: z.object({
            background: z.object({
                src: z.string(),
                alt: z.string(),
            }),
            logo: z.object({
                src: z.string(),
                alt: z.string(),
            }),
        }),

    }),
});

export const collections = {realisation};