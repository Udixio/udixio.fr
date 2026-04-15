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
 * Pipeline en 3 étapes + 2 pré-étapes :
 *
 *   Pré A : analyzeBrand          → BrandAnalysis JSON (claude-sonnet-4-5)
 *   Pré B : craftBackgroundPrompt → prompt FLUX photoréaliste/atmosphérique centré sur l'univers de marque (claude-sonnet-4-5)
 *
 *   Étape 1 : generateBaseImage → fond photoréaliste dans les couleurs et l'univers de la marque (flux.2-pro)
 *   Étape 2 : integrateAssets   → intégration AI du logo et/ou screen avec perspective (gemini-3-pro-image-preview)
 *   Étape 3 : applyFrame        → cadre abstrait SVG en couleur marque (sharp)
 *
 * Note : FLUX génère toujours un rendu photoréaliste/atmosphérique (son point fort).
 * L'identité graphique de la marque s'exprime via la couleur dominante, les matières/objets
 * de son univers physique, et l'intégration du logo en étape 2.
 */
export interface BackgroundMockupResult {
  src: string;
  alt: string;
}

export async function generateBackgroundMockup(
  options: BackgroundMockupOptions
): Promise<BackgroundMockupResult | null> {
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

  // ── Pré A : Analyse de marque ─────────────────────────────────────────────
  const analysis = await loadJsonDebug<BrandAnalysis>(slug, "0a-analysis")
    ?? await (async () => {
      const a = await analyzeBrand(apiKey, { title, description, themeSource, isDark, renderPath, logoSrc });
      await saveJsonDebug(slug, "0a-analysis", a);
      console.log(`🔍 Brand analysis for ${slug}:\n${JSON.stringify(a, null, 2)}\n`);
      return a;
    })();

  // ── Pré B : Prompt FLUX (valeurs + style fusionnés) ─────────────────────
  const backgroundPrompt = await loadTextDebug(slug, "0b-prompt")
    ?? await (async () => {
      const p = await craftBackgroundPrompt(apiKey, analysis, { title, themeSource, isDark });
      await saveTextDebug(slug, "0b-prompt", p);
      console.log(`🖊️  Background prompt for ${slug}:\n${p}\n`);
      return p;
    })();

  // ── Étape 1 : Fond généré directement dans le style de marque (FLUX) ─────
  let buffer = await loadImageDebug(slug, "1-background")
    ?? await (async () => {
      const b = await generateBaseImage(apiKey, backgroundPrompt);
      await saveDebugStep(b, slug, "1-background");
      return b;
    })();

  // ── Étape 2 : Intégration logo / screen ──────────────────────────────────
  buffer = await loadImageDebug(slug, "2-assets")
    ?? await (async () => {
      const b = await integrateAssets(apiKey, buffer, analysis, renderPath, logoSrc);
      await saveDebugStep(b, slug, "2-assets");
      return b;
    })();

  // ── Étape 3 : Cadre abstrait SVG ─────────────────────────────────────────
  buffer = await applyFrame(buffer, themeSource, analysis.logoGraphicRegister, slug);
  await saveDebugStep(buffer, slug, "3-frame");

  const src = await saveAsWebP(buffer, slug);
  const alt = `${title} — ${analysis.backgroundAlt}`;
  return { src, alt };
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ContentItem =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

// ─── Schéma Zod ───────────────────────────────────────────────────────────────

const BrandAnalysisSchema = z.object({
  // Style du logo
  logoGraphicRegister:       z.enum(["flat","illustrated","stencil","geometric","handdrawn","photographic","minimal","abstract"]),
  logoKeyShapes:             z.string(),
  logoVisualSymbol:          z.string(),
  logoStyleNotes:            z.string(),

  // Univers de marque (utilisé pour l'étape 1 — valeurs/atmosphère)
  brandPhysicalMaterials:    z.array(z.string()),
  brandAtmosphere:           z.string(),

  // Registre émotionnel
  emotionalKeywords:         z.array(z.string()),
  emotionVisualTranslations: z.array(z.string()),

  // Décision assets (étape 2)
  includeScreenshot:         z.boolean(),
  includeLogo:               z.boolean(),
  assetIntegrationNote:      z.string(),

  // Stratégie couleur
  colorDominanceApproach:    z.string(),
  complementaryTones:        z.array(z.string()),

  // Composition
  foregroundDescriptor:      z.string(),
  midgroundDescriptor:       z.string(),
  backgroundDescriptor:      z.string(),

  // Alt text en français pour l'image générée
  backgroundAlt:             z.string(),
});

type BrandAnalysis = z.infer<typeof BrandAnalysisSchema>;

const { $schema: _$schema, ...BRAND_ANALYSIS_SCHEMA } = z.toJSONSchema(BrandAnalysisSchema) as any;

// ─── Pré A : Analyse de marque ───────────────────────────────────────────────

async function buildAnalysisContent(
  options: Omit<BackgroundMockupOptions, "slug" | "apiKey">
): Promise<ContentItem[]> {
  const { title, description, themeSource, isDark, renderPath, logoSrc } = options;
  const renderBase64 = (await fs.readFile(renderPath)).toString("base64");

  const content: ContentItem[] = [
    {
      type: "text",
      text: `You are a senior art director planning a 4-step AI pipeline to create a portfolio card background.
Study the website screenshot and brand logo carefully. Return a precise JSON analysis.

Project: "${title}"
Description: ${description}
Brand color: ${themeSource}
Theme: ${isDark ? "dark" : "light"}

The background will always be a photorealistic/atmospheric image (FLUX's strength). Brand identity is expressed through dominant color, physical materials, and logo integration — NOT through graphic style transfer.

Analyze:
1. The logo's graphic register and style (flat/stencil/illustrated/geometric/etc.) — used only for the SVG frame shape choice
2. The physical materials, objects, textures, and environments that naturally belong to this brand's world (be very specific and concrete)
3. Exactly 3 emotional keywords and their photorealistic visual translation (light quality, texture, depth of field, etc.)
4. Whether a website screenshot should be integrated (true only for professional/digital service brands where showing the UI adds value; false otherwise)
5. Whether the logo should be integrated into the scene
6. A note on how to integrate the logo/screen naturally into a photorealistic scene (perspective, placement, lighting, material interaction)
7. How to make ${themeSource} dominant as the natural color of the photographed materials/environment (60–70% of frame) — not as a filter
8. Describe concrete foreground, midground, and background photographic elements
9. Write a short alt text in FRENCH (max 12 words) describing the visual content of the generated background — what will be photographically represented (e.g. "Produits bio en vrac sur fond vert-sauge texturé")

Be specific and faithful to what you actually see.`,
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

// ─── Pré B : Prompt FLUX — valeurs + style fusionnés ─────────────────────────

async function craftBackgroundPrompt(
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
          content: `You are writing a FLUX image generation prompt for a portfolio card background.

RENDERING STYLE — always photorealistic, never illustrated or flat design:
- Photo or studio shot quality: real materials, real textures, real light
- Shallow depth of field, natural or studio lighting, material authenticity
- The brand's visual identity is expressed through the SUBJECT MATTER and COLOR, not through graphic style

CRITICAL RULES:
- Brand color ${themeSource} must appear as the natural color of the photographed materials/environment (60–70% of frame)
- ${isDark ? "Dark field: moody, deep tones, dramatic lighting" : "Soft natural light, airy atmosphere — depth comes from texture and composition, not whiteness"}
- Left third: minimal, uncluttered — space for title/logo overlay
- NO text, labels, signs, or readable writing anywhere
- NO storefronts, shop fronts, or building facades
- NO people, faces, or hands
- English only, comma-separated descriptors, max 180 words
- Start with: "${title} — "
- Output the prompt ONLY`,
        },
        {
          role: "user",
          content: `Brand data for "${title}":

Physical world (concrete objects/materials to photograph): ${JSON.stringify(analysis.brandPhysicalMaterials)}
Atmosphere: ${analysis.brandAtmosphere}
Emotional keywords: ${analysis.emotionalKeywords.join(", ")}
Photographic translations: ${analysis.emotionVisualTranslations.join(", ")}
Composition: ${analysis.foregroundDescriptor} / ${analysis.midgroundDescriptor} / ${analysis.backgroundDescriptor}
Color in materials: ${analysis.colorDominanceApproach}
Complementary tones: ${analysis.complementaryTones.join(", ")}

Write the FLUX photorealistic background prompt now.`,
        },
      ],
      temperature: 0.8,
    }),
  });

  if (!res.ok) throw new Error(`Background prompt API error ${res.status}: ${await res.text()}`);

  const data = await res.json() as { choices: [{ message: { content: string } }] };
  const prompt = data.choices[0].message.content?.trim();
  if (!prompt) throw new Error("Empty response from background prompt crafting");
  return prompt;
}

// ─── Étape 1 : Génération FLUX (base atmosphérique) ──────────────────────────

async function generateBaseImage(apiKey: string, prompt: string): Promise<Buffer> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "black-forest-labs/flux.2-pro",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image"],
      image_config: { aspect_ratio: "16:9", image_size: "2K" },
    }),
  });

  if (!res.ok) throw new Error(`FLUX generation error ${res.status}: ${await res.text()}`);
  return extractImageBuffer(await res.json());
}

// ─── Étape 2 : Intégration assets (Gemini img2img) ────────────────────────────

async function integrateAssets(
  apiKey: string,
  buffer: Buffer,
  analysis: BrandAnalysis,
  renderPath: string,
  logoSrc: string | undefined,
): Promise<Buffer> {
  const hasLogo   = analysis.includeLogo && !!logoSrc;
  const hasScreen = analysis.includeScreenshot;

  if (!hasLogo && !hasScreen) return buffer;

  const content: ContentItem[] = [
    { type: "image_url", image_url: { url: `data:image/webp;base64,${buffer.toString("base64")}` } },
  ];

  const instructions: string[] = [
    `You are a graphic designer integrating brand assets into this background image.`,
    `Maintain the visual style and atmosphere exactly. Do not change the background composition.`,
    `${analysis.assetIntegrationNote}`,
    ``,
  ];

  if (hasLogo && logoSrc) {
    const logoBase64 = await loadAsBase64(join("public", logoSrc));
    if (logoBase64) {
      content.push({ type: "image_url", image_url: { url: logoBase64 } });
      instructions.push(
        `LOGO (image ${content.length - 1}):`,
        `- Place it in the LEFT THIRD of the image, vertically centered`,
        `- Integrate naturally: handle perspective, cast a subtle shadow if the scene requires it`,
        `- Scale so it's clearly legible (about 20-25% of image height)`,
        `- Match the lighting and atmosphere of the background`,
        `- The logo must feel embedded in the scene, not pasted on top`,
        ``,
      );
    }
  }

  if (hasScreen) {
    const screenBase64 = await loadAsBase64(renderPath, "webp");
    if (screenBase64) {
      content.push({ type: "image_url", image_url: { url: screenBase64 } });
      instructions.push(
        `WEBSITE SCREENSHOT (image ${content.length - 1}):`,
        `- Place it on the RIGHT SIDE, occupying roughly 45-50% of image width`,
        `- Display it as if on a surface or floating panel within the scene`,
        `- Apply slight perspective (3/4 angle or slight tilt) for depth`,
        `- Add a natural drop shadow consistent with the scene lighting`,
        `- It must feel part of the visual world, not a flat overlay`,
        ``,
      );
    }
  }

  instructions.push(`DO NOT add any text, people, or new graphical elements beyond what is described.`);
  instructions.push(`Output ONLY the final integrated image.`);

  content.push({ type: "text", text: instructions.join("\n") });

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-pro-image-preview",
      messages: [{ role: "user", content }],
      modalities: ["image"],
    }),
  });

  if (!res.ok) throw new Error(`Asset integration API error ${res.status}: ${await res.text()}`);
  return extractImageBuffer(await res.json());
}

// ─── Étape 4 : Cadre SVG abstrait ─────────────────────────────────────────────

function buildFrameSVG(w: number, h: number, color: string, register: string, slug: string): string {
  let s = [...slug].reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0) >>> 0 || 1;
  const rng = (): number => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 0x100000000; };

  const isGeometric = ["geometric", "stencil"].includes(register);

  const anchors = [
    { cx: -50,                        cy: h + 50,                   baseR: 200 + rng() * 60, opacity: 0.88 + rng() * 0.08 },
    { cx: w * 0.20 + (rng()-0.5)*60, cy: h + 35 + (rng()-0.5)*30, baseR: 130 + rng() * 50, opacity: 0.65 + rng() * 0.15 },
    { cx: w * 0.80 + (rng()-0.5)*60, cy: h + 20 + (rng()-0.5)*30, baseR: 90  + rng() * 40, opacity: 0.55 + rng() * 0.15 },
    { cx: w + 30,                     cy: -(20 + rng() * 40),       baseR: 70  + rng() * 35, opacity: 0.50 + rng() * 0.15 },
  ];

  const shapes = anchors.map(({ cx, cy, baseR, opacity }) => {
    const op = Math.min(1, opacity).toFixed(2);
    if (isGeometric) {
      const rot = ((rng() - 0.5) * 40).toFixed(1);
      const rx  = (baseR * 0.25).toFixed(0);
      return `<rect x="${(cx - baseR * 0.5).toFixed(0)}" y="${(cy - baseR * 0.55).toFixed(0)}" width="${baseR.toFixed(0)}" height="${(baseR * 0.85).toFixed(0)}" rx="${rx}" fill="${color}" opacity="${op}" transform="rotate(${rot},${cx.toFixed(0)},${cy.toFixed(0)})"/>`;
    }
    return `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${baseR.toFixed(0)}" fill="${color}" opacity="${op}"/>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">\n${shapes.join("\n")}\n</svg>`;
}

async function applyFrame(buffer: Buffer, themeSource: string, register: string, slug: string): Promise<Buffer> {
  const { width = 1920, height = 1080 } = await sharp(buffer).metadata();
  const svg = buildFrameSVG(width, height, themeSource, register, slug);
  const frameBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return sharp(buffer).composite([{ input: frameBuffer, blend: "over" }]).toBuffer();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function extractImageBuffer(data: any): Promise<Buffer> {
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

  if (rawUrl.startsWith("data:"))
    return Buffer.from(rawUrl.split(",")[1], "base64");

  const download = await fetch(rawUrl);
  if (!download.ok) throw new Error(`Failed to download image: ${download.status}`);
  return Buffer.from(await download.arrayBuffer());
}

async function loadAsBase64(filePath: string, forceFormat?: "webp" | "png"): Promise<string | null> {
  try {
    await fs.access(filePath);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    let buffer: Buffer;
    if (ext === "svg" || forceFormat === "png") {
      buffer = await sharp(filePath).png().toBuffer();
    } else if (forceFormat === "webp") {
      buffer = await fs.readFile(filePath);
    } else {
      buffer = await fs.readFile(filePath);
    }
    const mimeType = forceFormat ? `image/${forceFormat}` : ext === "svg" ? "image/png" : ext === "jpg" ? "image/jpeg" : `image/${ext}`;
    return `data:${mimeType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

async function tryEncodeLogoAsContentItem(logoSrc: string): Promise<ContentItem | null> {
  const url = await loadAsBase64(join("public", logoSrc));
  if (!url) return null;
  return { type: "image_url", image_url: { url } };
}

// ─── Cache debug ──────────────────────────────────────────────────────────────

const DEBUG_DIR = join("src", "assets", "debug");

async function ensureDebugDir(): Promise<void> {
  await fs.mkdir(DEBUG_DIR, { recursive: true });
}

async function saveDebugStep(buffer: Buffer, slug: string, step: string): Promise<void> {
  await ensureDebugDir();
  const outputPath = join(DEBUG_DIR, `${slug}-${step}.webp`);
  await sharp(buffer).webp({ quality: 85 }).toFile(outputPath);
  console.log(`🐛 Debug [${step}]: ${outputPath}`);
}

async function loadImageDebug(slug: string, step: string): Promise<Buffer | null> {
  const p = join(DEBUG_DIR, `${slug}-${step}.webp`);
  try {
    await fs.access(p);
    console.log(`🐛 Reusing [${step}]: ${p}`);
    return fs.readFile(p);
  } catch { return null; }
}

async function saveJsonDebug<T>(slug: string, step: string, data: T): Promise<void> {
  await ensureDebugDir();
  await fs.writeFile(join(DEBUG_DIR, `${slug}-${step}.json`), JSON.stringify(data, null, 2), "utf-8");
}

async function loadJsonDebug<T>(slug: string, step: string): Promise<T | null> {
  const p = join(DEBUG_DIR, `${slug}-${step}.json`);
  try {
    await fs.access(p);
    console.log(`🐛 Reusing [${step}]: ${p}`);
    return JSON.parse(await fs.readFile(p, "utf-8")) as T;
  } catch { return null; }
}

async function saveTextDebug(slug: string, step: string, text: string): Promise<void> {
  await ensureDebugDir();
  await fs.writeFile(join(DEBUG_DIR, `${slug}-${step}.txt`), text, "utf-8");
}

async function loadTextDebug(slug: string, step: string): Promise<string | null> {
  const p = join(DEBUG_DIR, `${slug}-${step}.txt`);
  try {
    await fs.access(p);
    console.log(`🐛 Reusing [${step}]: ${p}`);
    return fs.readFile(p, "utf-8");
  } catch { return null; }
}

async function saveAsWebP(imageBuffer: Buffer, slug: string): Promise<string> {
  const outputDir = join("src", "assets", "backgrounds");
  const outputPath = join(outputDir, `${slug}-background.webp`);
  await fs.mkdir(outputDir, { recursive: true });
  await sharp(imageBuffer).webp({ quality: 90 }).toFile(outputPath);
  console.log(`✅ Background saved: ${outputPath}`);
  // Chemin relatif depuis les fichiers MDX dans src/data/realisation/
  return `../../assets/backgrounds/${slug}-background.webp`;
}
