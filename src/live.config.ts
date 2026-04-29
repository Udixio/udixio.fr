// Define live collections for accessing real-time data
import { defineLiveCollection, z } from "astro:content";
import { articleLoader } from "@/article-loader.ts";

const articleTag = z.object({
  id: z.string(),
  name: z.string(),
});

const articleAuthor = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullish(),
  image: z.string().nullish(),
});

const blog = defineLiveCollection({
  loader: articleLoader({
    endpoint: import.meta.env.API_URL,
    apiKey: import.meta.env.API_KEY,
  }),
  schema: z.object({
    id: z.string(),
    title: z.string(),
    slug: z.string(),
    description: z.string().nullish(),
    content: z.record(z.string(), z.unknown()).optional(),
    htmlContent: z.string(),
    coverImageUrl: z.string().nullish(),
    status: z.enum(["DRAFT", "PUBLISHED", "PRIVATE", "ARCHIVED"]),
    author: articleAuthor.nullish(),
    tags: z.array(articleTag).default([]),
    metaTitle: z.string().nullish(),
    metaDescription: z.string().nullish(),
    commentCount: z.number().default(0),
    shareCount: z.number().default(0),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
});

// Export a single `collections` object to register your collection(s)
export const collections = { blog };
