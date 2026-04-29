import type { LiveLoader } from "astro/loaders";

// ---------------------------------------------------------------------------
// Types aligned with the NestJS Post entity / blog.controller.ts responses
// ---------------------------------------------------------------------------

export interface ArticleTag {
  id: string;
  name: string;
}

export interface ArticleAuthor {
  id: string;
  name: string;
  email?: string;
  image?: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  description?: string;
  /** Raw TipTap JSON content */
  content?: Record<string, unknown>;
  /** Pre-rendered HTML (derived from content JSON) */
  htmlContent: string;
  coverImageUrl?: string;
  status: "DRAFT" | "PUBLISHED" | "PRIVATE" | "ARCHIVED";
  author?: ArticleAuthor;
  tags: ArticleTag[];
  metaTitle?: string;
  metaDescription?: string;
  commentCount: number;
  shareCount: number;
  createdAt: string;
  updatedAt: string;
}

interface EntryFilter {
  /** UUID or slug */
  id: string;
}

interface CollectionFilter {
  author?: string;
  category?: string;
  tag?: string;
  tags?: string[];
  status?: string;
  featured?: boolean;
  published?: boolean;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ---------------------------------------------------------------------------
// TipTap JSON → plain HTML converter (lightweight, no runtime deps)
// ---------------------------------------------------------------------------

function tiptapToHtml(doc: Record<string, unknown> | undefined): string {
  if (!doc) return "";

  const renderNode = (node: Record<string, unknown>): string => {
    const type = node.type as string | undefined;
    const content =
      (node.content as Record<string, unknown>[] | undefined) ?? [];
    const attrs = (node.attrs as Record<string, unknown>) ?? {};
    const marks = (node.marks as Record<string, unknown>[]) ?? [];

    const children = content.map(renderNode).join("");

    // Apply marks to text nodes
    const applyMarks = (text: string, ms: Record<string, unknown>[]) =>
      ms.reduce((acc, mark) => {
        switch (mark.type) {
          case "bold":
            return `<strong>${acc}</strong>`;
          case "italic":
            return `<em>${acc}</em>`;
          case "strike":
            return `<s>${acc}</s>`;
          case "code":
            return `<code>${acc}</code>`;
          case "underline":
            return `<u>${acc}</u>`;
          case "link": {
            const href =
              ((mark.attrs as Record<string, unknown>) ?? {}).href ?? "#";
            return `<a href="${href}">${acc}</a>`;
          }
          default:
            return acc;
        }
      }, text);

    switch (type) {
      case "doc":
        return children;
      case "paragraph":
        return `<p>${children}</p>`;
      case "heading": {
        const level = (attrs.level as number) ?? 1;
        return `<h${level}>${children}</h${level}>`;
      }
      case "text": {
        const escaped = String(node.text ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        return applyMarks(escaped, marks);
      }
      case "bulletList":
        return `<ul>${children}</ul>`;
      case "orderedList":
        return `<ol>${children}</ol>`;
      case "listItem":
        return `<li>${children}</li>`;
      case "blockquote":
        return `<blockquote>${children}</blockquote>`;
      case "codeBlock": {
        const lang = (attrs.language as string) ?? "";
        return `<pre><code class="language-${lang}">${children}</code></pre>`;
      }
      case "hardBreak":
        return "<br>";
      case "horizontalRule":
        return "<hr>";
      case "image": {
        const src = (attrs.src as string) ?? "";
        const alt = (attrs.alt as string) ?? "";
        return `<img src="${src}" alt="${alt}" loading="lazy">`;
      }
      default:
        return children;
    }
  };

  return renderNode(doc);
}

// ---------------------------------------------------------------------------
// Raw API post → Article
// ---------------------------------------------------------------------------

function mapPost(raw: Record<string, unknown>): Article {
  const content = raw.content as Record<string, unknown> | undefined;

  const authorRaw = raw.author as Record<string, unknown> | undefined;
  const author: ArticleAuthor | undefined = authorRaw
    ? {
        id: String(authorRaw.id ?? ""),
        name: String(authorRaw.name ?? authorRaw.email ?? ""),
        email: authorRaw.email as string | undefined,
        image: authorRaw.image as string | undefined,
      }
    : undefined;

  const tagsRaw = (raw.tags as Record<string, unknown>[] | undefined) ?? [];
  const tags: ArticleTag[] = tagsRaw.map((t) => ({
    id: String(t.id ?? ""),
    name: String(t.name ?? ""),
  }));

  return {
    id: String(raw.id ?? ""),
    title: String(raw.title ?? ""),
    slug: String(raw.slug ?? ""),
    description: raw.description as string | undefined,
    content,
    htmlContent: tiptapToHtml(content),
    coverImageUrl: raw.coverImageUrl as string | undefined,
    status: (raw.status as Article["status"]) ?? "DRAFT",
    author,
    tags,
    metaTitle: raw.metaTitle as string | undefined,
    metaDescription: raw.metaDescription as string | undefined,
    commentCount: Number(raw.commentCount ?? 0),
    shareCount: Number(raw.shareCount ?? 0),
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
  };
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function apiFetch(
  endpoint: string,
  path: string,
  apiKey: string,
  params?: Record<string, string | number | boolean | string[] | undefined>,
): Promise<Response> {
  const url = new URL(path, endpoint.endsWith("/") ? endpoint : endpoint + "/");

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        value.forEach((v) => url.searchParams.append(key, String(v)));
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });
}

// ---------------------------------------------------------------------------
// Loader factory
// ---------------------------------------------------------------------------

export function articleLoader(config: {
  apiKey: string;
  /** Base URL of the NestJS API, e.g. https://api.udixio.com */
  endpoint: string;
}): LiveLoader<Article, EntryFilter, CollectionFilter> {
  console.log("articleLoader", config);
  return {
    name: "article-loader",

    // ── Collection ──────────────────────────────────────────────────────────
    loadCollection: async ({ filter }) => {
      try {
        const params: Record<
          string,
          string | number | boolean | string[] | undefined
        > = {
          status: filter?.status ?? "PUBLISHED",
          ...(filter?.author && { author: filter.author }),
          ...(filter?.tag && { tag: filter.tag }),
          ...(filter?.tags && { tags: filter.tags }),
          ...(filter?.search && { search: filter.search }),
          ...(filter?.dateFrom && { dateFrom: filter.dateFrom }),
          ...(filter?.dateTo && { dateTo: filter.dateTo }),
          ...(filter?.limit !== undefined && { limit: filter.limit }),
          ...(filter?.offset !== undefined && { offset: filter.offset }),
          ...(filter?.sortBy && { sortBy: filter.sortBy }),
          ...(filter?.sortOrder && { sortOrder: filter.sortOrder }),
        };

        const res = await apiFetch(
          config.endpoint,
          "blog",
          config.apiKey,
          params,
        );

        if (!res.ok) {
          throw new Error(`API returned ${res.status}: ${await res.text()}`);
        }

        const raw = (await res.json()) as Record<string, unknown>[];
        const articles = Array.isArray(raw) ? raw.map(mapPost) : [];

        return {
          entries: articles.map((article) => ({
            id: article.id,
            data: article,
          })),
        };
      } catch (error) {
        return {
          error: new Error("Failed to load articles", { cause: error }),
        };
      }
    },

    // ── Single entry ─────────────────────────────────────────────────────────
    loadEntry: async ({ filter }) => {
      try {
        // Support both UUID (GET /blog/:id) and slug (GET /blog/slug/:slug)
        const isUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            filter.id,
          );
        const path = isUuid ? `blog/${filter.id}` : `blog/slug/${filter.id}`;

        const res = await apiFetch(config.endpoint, path, config.apiKey);

        if (res.status === 404) {
          return { error: new Error(`Article not found: ${filter.id}`) };
        }

        if (!res.ok) {
          throw new Error(`API returned ${res.status}: ${await res.text()}`);
        }

        const raw = (await res.json()) as Record<string, unknown>;
        const article = mapPost(raw);

        return {
          id: article.id,
          data: article,
          rendered: {
            html: article.htmlContent,
          },
        };
      } catch (error) {
        return {
          error: new Error("Failed to load article", { cause: error }),
        };
      }
    },
  };
}
