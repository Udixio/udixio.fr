import rss from "@astrojs/rss";
import { getLiveCollection } from "astro:content";

export const prerender = false;

export async function GET(context) {
  const { entries: blog = [] } = await getLiveCollection("blog", {
    status: "PUBLISHED",
  });

  return rss({
    title: "Blog Udixio",
    description:
      "Actualités et conseils en développement web par l'agence Udixio",
    site: context.site,
    items: blog.map((post) => ({
      title: post.data.title,
      pubDate: new Date(post.data.createdAt),
      description: post.data.description,
      link: `/blog/${post.data.slug}/`,
    })),
  });
}
