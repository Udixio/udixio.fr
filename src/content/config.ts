import { defineCollection } from 'astro:content';
import { articleLoader } from '@/article-loader';

const blog = defineCollection({
  loader: articleLoader({
    endpoint: import.meta.env.API_URL ?? 'http://localhost:3000',
    apiKey: import.meta.env.API_KEY ?? '',
  }),
});

export const collections = { blog };
