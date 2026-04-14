import { promises as fs } from "fs";
import path from "node:path";
import { join } from "path";
import sharp from "sharp";
import { z } from "zod";

export interface BackgroundMockupOptions {
  slug: string;
  title: string;
  description: string;
  themeSource: string;
  isDark: boolean;
  renderPath: string;
  logoSrc?: string;
  apiKey?: string;
}

/**
 * Génère un background mockup via OpenRouter pour les projets sans images.background.
 *
 * Pipeline en 3 appels séparés :
 *   1. claude-sonnet-4-5 → BrandAnalysis (JSON structuré, schema forcé)
 *   2. claude-sonnet-4-5 → FluxPrompt (texte nourri par le JSON complet)
 *   3. flux.2-pro         → Image (buffer webp)
 */
export async function generateBackgroundMockup(
  options: BackgroundMockupOptions
): Promise<string | null> {
  const { slug, title, description, themeSource, isDark, renderPath, logoSrc, apiKey } = options;

  if (!apiKey) {
    console.warn(`⚠️  OPENROUTER_API_KEY not set — skipping background generation for ${slug}`);
    return null;
  }

  try {
    await fs.access(renderPath);
  } catch {
    console.warn(`⚠️  Render not found at ${renderPath} — skipping background generation for ${slug}`);
    return null;
  }

  // ── Étape 1 : Analyse de marque (JSON structuré, schema forcé) ───────────
  const brandAnalysis = await analyzeBrand(apiKey, {
    title, description, themeSource, isDark, renderPath, logoSrc,
  });
  console.log(`🔍 Brand analysis for ${slug}:\n${JSON.stringify(brandAnalysis, null, 2)}\n`);

  // ── Étape 2 : Rédaction du prompt FLUX ───────────────────────────────────
  const fluxPrompt = await craftFluxPrompt(apiKey, brandAnalysis, { title, themeSource, isDark });
  console.log(`🖊️  Flux prompt for ${slug}:\n${fluxPrompt}\n`);

  // ── Étape 3 : Génération de l'image ──────────────────────────────────────
  const imageBuffer = await generateImage(apiKey, fluxPrompt);
  return saveAsWebP(imageBuffer, slug);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ContentItem =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

// ─── Schéma Zod (génère un JSON Schema compatible Anthropic) ─────────────────

const BrandAnalysisSchema = z.object({
  // Style du logo
  logoGraphicRegister:      z.enum(["flat","illustrated","stencil","geometric","handdrawn","photographic","minimal","abstract"]),
  logoKeyShapes:            z.string(),
  logoVisualSymbol:         z.string(),
  logoStyleNotes:           z.string(),

  // Univers de marque
  brandPhysicalMaterials:   z.array(z.string()),
  brandAtmosphere:          z.string(),

  // Registre émotionnel — exactement 3 éléments (guidé par le prompt)
  emotionalKeywords:        z.array(z.string()),
  emotionVisualTranslations:z.array(z.string()),

  // Direction créative
  visualDirection:          z.enum(["flat_graphic","editorial_macro","abstract_atmospheric","illustrated","composed_graphic"]),
  directionRationale:       z.string(),

  // Stratégie couleur
  colorDominanceApproach:   z.string(),
  complementaryTones:       z.array(z.string()),

  // Composition
  foregroundDescriptor:     z.string(),
  midgroundDescriptor:      z.string(),
  backgroundDescriptor:     z.string(),
});

type BrandAnalysis = z.infer<typeof BrandAnalysisSchema>;

// z.toJSONSchema() génère un JSON Schema compatible Anthropic
// On retire $schema car Anthropic ne l'accepte pas dans response_format
const { $schema: _$schema, ...BRAND_ANALYSIS_SCHEMA } = z.toJSONSchema(BrandAnalysisSchema) as any;

async function buildAnalysisContent(options: Omit<BackgroundMockupOptions, "slug" | "apiKey">): Promise<ContentItem[]> {
  const { title, description, themeSource, isDark, renderPath, logoSrc } = options;

  const renderBase64 = (await fs.readFile(renderPath)).toString("base64");

  const content: ContentItem[] = [
    {
      type: "text",
      text: `You are a senior art director analyzing a brand to create its portfolio card background.
Study the website screenshot and brand logo carefully. Return a precise JSON analysis.

Project: "${title}"
Description: ${description}
Brand color: ${themeSource}
Theme: ${isDark ? "dark" : "light"}

Analyze:
1. The logo's graphic register and style (flat/stencil/illustrated/geometric/etc.)
2. The physical materials and objects that naturally belong to this brand's world
3. Exactly 3 emotional keywords that define the brand, and how each translates visually (emotionalKeywords and emotionVisualTranslations must each have exactly 3 items)
4. The most appropriate visual direction for a background card that matches this brand's graphic language
5. How to make ${themeSource} dominant (60–70% of frame) in a way authentic to this brand
6. Describe foreground, midground, and background elements for the composition

Be specific and faithful to what you actually see in the logo and screenshot.`,
    },
    {
      type: "image_url",
      image_url: { url: `data:image/webp;base64,${renderBase64}` },
    },
  ];

  if (logoSrc) {
    const logoItem = await tryEncodeLogoAsContentItem(logoSrc);
    if (logoItem) {
      content.push({ type: "text", text: "Brand logo:" });
      content.push(logoItem);
    }
  }

  return content;
}

async function analyzeBrand(
  apiKey: string,
  options: Omit<BackgroundMockupOptions, "slug" | "apiKey">
): Promise<BrandAnalysis> {
  const content = await buildAnalysisContent(options);

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "anthropic/claude-sonnet-4-5",
      messages: [{ role: "user", content }],
      temperature: 0.3,
      response_format: {
        type: "json_schema",
        json_schema: { name: "brand_analysis", strict: true, schema: BRAND_ANALYSIS_SCHEMA },
      },
      plugins: [{ id: "response-healing" }],
    }),
  });

  if (!res.ok) throw new Error(`Brand analysis API error ${res.status}: ${await res.text()}`);

  const data = await res.json() as { choices: [{ message: { content: string } }] };
  const raw = data.choices[0].message.content;
  if (!raw) throw new Error("Empty response from brand analysis");
  return BrandAnalysisSchema.parse(JSON.parse(raw));
}

// ─── Étape 2 : Rédaction du prompt FLUX ──────────────────────────────────────

async function craftFluxPrompt(
  apiKey: string,
  analysis: BrandAnalysis,
  meta: { title: string; themeSource: string; isDark: boolean }
): Promise<string> {
  const { title, themeSource, isDark } = meta;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "anthropic/claude-sonnet-4-5",
      messages: [
        {
          role: "system",
          content: `You are writing a precise image generation prompt for FLUX, a state-of-the-art text-to-image model.
You receive a detailed brand analysis and must translate it into a single, highly effective FLUX prompt.

Rules:
- Open with the style descriptor matching the chosen visual direction (e.g. "flat vector illustration," / "macro editorial photography," / "abstract color field,")
- The brand color ${themeSource} must dominate (60–70% of frame)
- ${isDark ? "Dark-field: rich deep tones, luminous material accents" : "Light-field: airy and bright with natural tonal depth"}
- Left third of frame must stay open and minimal (card title overlays there)
- NO text, signs, labels, or readable writing
- NO storefronts, building facades, or shop interiors
- NO people, faces, or hands
- English only, present tense, comma-separated descriptors, max 200 words
- Output the prompt ONLY — no explanation, no preamble`,
        },
        {
          role: "user",
          content: `Brand analysis for "${title}":\n${JSON.stringify(analysis, null, 2)}\n\nWrite the FLUX image generation prompt now.`,
        },
      ],
      temperature: 0.8,
    }),
  });

  if (!res.ok) throw new Error(`Prompt crafting API error ${res.status}: ${await res.text()}`);

  const data = await res.json() as { choices: [{ message: { content: string } }] };
  const prompt = data.choices[0].message.content?.trim();
  if (!prompt) throw new Error("Empty response from prompt crafting");
  return prompt;
}

// ─── Étape 3 : Génération FLUX ────────────────────────────────────────────────

async function generateImage(apiKey: string, prompt: string): Promise<Buffer> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "black-forest-labs/flux.2-pro",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image"],
      image_config: { aspect_ratio: "16:9", image_size: "2K" },
    }),
  });

  if (!res.ok)
    throw new Error(`Image generation error ${res.status}: ${await res.text()}`);

  const data = (await res.json()) as any;
  const message = data.choices?.[0]?.message;
  const content = message?.content;

  const findInArray = (arr: any[]): string | undefined => {
    const item = arr.find((c: any) => c.type === "image_url" || c.type === "image");
    return item?.image_url?.url ?? item?.image?.url ?? item?.url;
  };

  let rawUrl: string | undefined;
  if (Array.isArray(message?.images))   rawUrl = findInArray(message.images);
  else if (Array.isArray(content))      rawUrl = findInArray(content);
  else if (typeof content === "string") rawUrl = content;

  if (!rawUrl)
    throw new Error(`No image found in response. message keys: ${Object.keys(message ?? {}).join(", ")}`);

  if (rawUrl.startsWith("data:")) {
    return Buffer.from(rawUrl.split(",")[1], "base64");
  }

  const download = await fetch(rawUrl);
  if (!download.ok) throw new Error(`Failed to download image: ${download.status}`);
  return Buffer.from(await download.arrayBuffer());
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function tryEncodeLogoAsContentItem(logoSrc: string): Promise<ContentItem | null> {
  const logoPath = join("public", logoSrc);
  try {
    await fs.access(logoPath);
    const ext = path.extname(logoPath).slice(1).toLowerCase();
    const buffer = ext === "svg" ? await sharp(logoPath).png().toBuffer() : await fs.readFile(logoPath);
    const mimeType = ext === "svg" ? "image/png" : ext === "jpg" ? "image/jpeg" : `image/${ext}`;
    return { type: "image_url", image_url: { url: `data:${mimeType};base64,${buffer.toString("base64")}` } };
  } catch {
    return null;
  }
}

async function saveAsWebP(imageBuffer: Buffer, slug: string): Promise<string> {
  const outputDir = join("public", "images", "realisations");
  const outputPath = join(outputDir, `${slug}-background.webp`);
  await fs.mkdir(outputDir, { recursive: true });
  await sharp(imageBuffer).webp({ quality: 90 }).toFile(outputPath);
  console.log(`✅ Background saved: ${outputPath}`);
  return `/images/realisations/${slug}-background.webp`;
}
