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
            }).optional(),
            logo: z.object({
                src: z.string(),
                alt: z.string(),
            }).optional(),
        }),
        website: z.string().url().optional(),
        summary: z.string(),
        technologies: z.array(z.string()).optional(),
        services: z.array(z.string()).optional(),
    }),
});

const technology = defineCollection({
    loader: glob({pattern: '**/[^_]*.{md,mdx}', base: "./src/data/technology"}),
    schema: z.object({
        name: z.string(), // Nom unique de la technologie
        tags: z.string().optional(), // Ex. : framework, CMS, CSS, etc.
        description: z.string().optional(), // Brève description
        logo: z.string().optional(), // URL ou chemin vers le logo
    }),
})

export const collections = {technology, realisation};