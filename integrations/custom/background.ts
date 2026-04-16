import { promises as fs } from "fs";
import path from "node:path";
import { join } from "path";
import { trace as potraceTrace } from "potrace";
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
 * Pipeline hybride — 2 pré-étapes + 2 étapes :
 *
 *   Pré A : analyzeBrand  → BrandAnalysis JSON (claude-sonnet-4-5)
 *   Pré B : craftPrompt   → prompt adapté au chemin choisi (claude-sonnet-4-5)
 *
 *   Chemin A — pas d'assets (includeLogo=false, includeScreenshot=false) :
 *     Étape 1 : generateBaseImage  → fond photoréaliste pur (flux.2-pro)
 *
 *   Chemin B — avec assets (logo et/ou screen) :
 *     Étape 1 : generateWithAssets → Gemini génère fond + assets en une seule passe
 *                                    (le device est planifié dans la composition dès le départ)
 *
 *   Étape 2 (commun) : applyFrame → cadre abstrait SVG en couleur marque (sharp)
 */
export interface BackgroundMockupResult {
  src: string;
  alt: string;
  frameSrc?: string; // chemin vers le SVG du calque décoratif (responsive)
}

export async function generateBackgroundMockup(
  options: BackgroundMockupOptions,
): Promise<BackgroundMockupResult | null> {
  const {
    slug,
    title,
    description,
    themeSource,
    isDark,
    renderPath,
    logoSrc,
    apiKey,
  } = options;

  if (!apiKey) {
    console.warn(
      `⚠️  OPENROUTER_API_KEY not set — skipping background generation for ${slug}`,
    );
    return null;
  }

  try {
    await fs.access(renderPath);
  } catch {
    console.warn(
      `⚠️  Render not found at ${renderPath} — skipping background generation for ${slug}`,
    );
    return null;
  }

  // ── Pré A : Analyse de marque ─────────────────────────────────────────────
  const analysis =
    (await loadJsonDebug<BrandAnalysis>(slug, "0a-analysis")) ??
    (await (async () => {
      const a = await analyzeBrand(apiKey, {
        title,
        description,
        themeSource,
        isDark,
        renderPath,
        logoSrc,
      });
      await saveJsonDebug(slug, "0a-analysis", a);
      console.log(
        `🔍 Brand analysis for ${slug}:\n${JSON.stringify(a, null, 2)}\n`,
      );
      return a;
    })());

  const hasAssets = (analysis.includeLogo && !!logoSrc) || analysis.includeScreenshot;

  // ── Pré B : Prompt adapté au chemin choisi ───────────────────────────────
  const backgroundPrompt =
    (await loadTextDebug(slug, "0b-prompt")) ??
    (await (async () => {
      const p = hasAssets
        ? await craftBackgroundWithAssetsPrompt(apiKey, analysis, { title, themeSource, isDark })
        : await craftBackgroundPrompt(apiKey, analysis, { title, themeSource, isDark });
      await saveTextDebug(slug, "0b-prompt", p);
      console.log(`🖊️  Background prompt [${hasAssets ? "gemini" : "flux"}] for ${slug}:\n${p}\n`);
      return p;
    })());

  // ── Étape 1 : Génération (FLUX pur ou Gemini avec assets) ─────────────────
  // Normalisation à 1920×1080 : FLUX sort en 2K (downscale propre),
  // Gemini sort souvent en ~1024px (upscale nécessaire).
  const TARGET_W = 1920;
  const TARGET_H = 1080;

  let buffer =
    (await loadImageDebug(slug, "1-background")) ??
    (await (async () => {
      const raw = hasAssets
        ? await generateWithAssets(apiKey, backgroundPrompt, analysis, renderPath, logoSrc)
        : await generateBaseImage(apiKey, backgroundPrompt);
      const { width: rawW = 0, height: rawH = 0 } = await sharp(raw).metadata();
      const b = (rawW !== TARGET_W || rawH !== TARGET_H)
        ? await sharp(raw).resize(TARGET_W, TARGET_H, { fit: "cover", position: "centre" }).toBuffer()
        : raw;
      await saveDebugStep(b, slug, "1-background");
      return b;
    })());

  // ── Étape 2 : Calque décoratif SVG (pas de composite raster) ─────────────
  // debug/${slug}-2-frame-layer.png  → PNG transparent (supprimable → force regen Gemini)
  // debug/${slug}-2-frame-layer.svg  → copie debug du SVG
  // src/assets/backgrounds/${slug}-frame-layer.svg → SVG overlay responsive
  // Le fond est sauvegardé pur — le calque est superposé en CSS dans le composant
  const frameSrc = await generateFrameLayer(apiKey, buffer, themeSource, analysis.frameMotif, analysis, slug);

  const src = await saveAsWebP(buffer, slug);
  const alt = `${title} — ${analysis.backgroundAlt}`;
  return { src, alt, frameSrc };
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ContentItem =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

// ─── Schéma Zod ───────────────────────────────────────────────────────────────

const BrandAnalysisSchema = z.object({
  // Style du logo
  logoGraphicRegister: z.enum([
    "flat",
    "illustrated",
    "stencil",
    "geometric",
    "handdrawn",
    "photographic",
    "minimal",
    "abstract",
  ]),
  logoKeyShapes: z.string(),
  logoVisualSymbol: z.string(),
  logoStyleNotes: z.string(),

  // Monde aspirationnel du CLIENT (pas l'univers opérationnel de la marque)
  brandPhysicalMaterials: z.array(z.string()),
  brandAtmosphere: z.string(),

  // Registre émotionnel — du point de vue du client
  emotionalKeywords: z.array(z.string()),
  emotionVisualTranslations: z.array(z.string()),

  // Décision assets + scène éditoriale complète
  includeScreenshot: z.boolean(),
  includeLogo: z.boolean(),
  assetIntegrationNote: z.string(), // description précise de la scène
  // Position horizontale du device dans le cadre — utilisée pour placer le calque décoratif à l'opposé
  devicePosition: z.enum(["left", "center-left", "center", "center-right", "right", "none"]),

  // Stratégie couleur
  colorDominanceApproach: z.string(),
  complementaryTones: z.array(z.string()),

  // Composition
  foregroundDescriptor: z.string(),
  midgroundDescriptor: z.string(),
  backgroundDescriptor: z.string(),

  // Motif du calque de cadre abstrait
  frameMotif: z.enum(["botanical", "paint_splash", "flowing_wave", "geometric_shard", "organic_blob", "dot_cluster"]),

  // Alt text en français pour l'image générée
  backgroundAlt: z.string(),
});

type BrandAnalysis = z.infer<typeof BrandAnalysisSchema>;

const { $schema: _$schema, ...BRAND_ANALYSIS_SCHEMA } = z.toJSONSchema(
  BrandAnalysisSchema,
) as any;

// ─── Pré A : Analyse de marque ───────────────────────────────────────────────

async function buildAnalysisContent(
  options: Omit<BackgroundMockupOptions, "slug" | "apiKey">,
): Promise<ContentItem[]> {
  const { title, description, themeSource, isDark, renderPath, logoSrc } =
    options;
  const renderBase64 = (await fs.readFile(renderPath)).toString("base64");

  const content: ContentItem[] = [
    {
      type: "text",
      text: `You are a senior art director planning an AI pipeline to create a photorealistic portfolio card background.
Study the website screenshot and brand logo carefully. Return a precise JSON analysis.

Project: "${title}"
Description: ${description}
Brand color: ${themeSource}
Theme: ${isDark ? "dark" : "light"}

CORE PRINCIPLE: The background is seen by the brand's CLIENTS, not the brand itself. It must evoke the experience or outcome the client gains — what their life looks like after using this service. This aspiration must be specific and honest: it comes from what this brand concretely delivers, not from a generic lifestyle fantasy. A homeowner enjoying their newly landscaped garden is authentic aspiration. A millionaire on a yacht is not.

The device (laptop, tablet, or phone) is ALWAYS the primary visual element — it must occupy at least 20–25% of the image surface and be in clear focus. Everything else in the scene is context that supports it.

Analyze:
1. Logo graphic register (flat/stencil/illustrated/geometric/handdrawn/photographic/minimal/abstract) — used only for the decorative frame overlay style
2. Who are the clients of this brand, and what does their world look like after engaging with this service? Identify the physical environment, materials, and atmosphere that authentically represent the CLIENT's transformed reality — specific to what this brand delivers, not generic success imagery.
3. Exactly 3 emotional keywords (what the client feels thanks to this brand) and their photorealistic visual translation (light quality, texture, depth of field)
4. Should a website screenshot be integrated? Set true if the scene naturally includes a surface where a device would realistically rest. Set false otherwise.
5. Should the logo be integrated? Set true only for distinctive graphic registers (illustrated, stencil, handdrawn, geometric). Set false for plain wordmarks.
6. Describe the precise scene from the client's perspective: a specific, authentic moment that captures the outcome this brand delivers. The device is the hero — describe its exact position, surface, angle, and how much of the frame it occupies. Human presence is welcome and natural (hands, a partial arm, a relaxed posture) but avoid clichéd "success" props (luxury watch, yacht deck, tropical beach, generic coffee cup on marble). The scene must be unmistakably tied to THIS brand's specific value, not interchangeable with any other service.
7. Where is the device positioned horizontally in the frame? (left / center-left / center / center-right / right) — the decorative overlay will be placed on the opposite side to avoid covering it.
8. How to make ${themeSource} dominant (60–70% of frame) as the natural color of the client's environment
9. Concrete foreground, midground, and background photographic elements
10. Choose the abstract decorative motif for the frame overlay: "botanical" (nature/organic), "paint_splash" (creative/artisanal), "flowing_wave" (digital/fluid/modern), "geometric_shard" (technical/architectural), "organic_blob" (friendly/human), "dot_cluster" (pattern/data/playful)
11. Short alt text in FRENCH (max 12 words) describing what will be shown

The scene should feel like an authentic editorial photograph — aspirational but grounded in the specific reality of what this brand actually changes for its clients.`,
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
  options: Omit<BackgroundMockupOptions, "slug" | "apiKey">,
): Promise<BrandAnalysis> {
  const content = await buildAnalysisContent(options);

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "anthropic/claude-sonnet-4-5",
      messages: [{ role: "user", content }],
      temperature: 0.3,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "brand_analysis",
          strict: true,
          schema: BRAND_ANALYSIS_SCHEMA,
        },
      },
      plugins: [{ id: "response-healing" }],
    }),
  });

  if (!res.ok)
    throw new Error(
      `Brand analysis API error ${res.status}: ${await res.text()}`,
    );

  const data = (await res.json()) as {
    choices: [{ message: { content: string } }];
  };
  const raw = data.choices[0].message.content;
  if (!raw) throw new Error("Empty response from brand analysis");
  return BrandAnalysisSchema.parse(JSON.parse(raw));
}

// ─── Pré B : Prompt FLUX — valeurs + style fusionnés ─────────────────────────

async function craftBackgroundPrompt(
  apiKey: string,
  analysis: BrandAnalysis,
  meta: { title: string; themeSource: string; isDark: boolean },
): Promise<string> {
  const { title, themeSource, isDark } = meta;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "anthropic/claude-sonnet-4-5",
      messages: [
        {
          role: "system",
          content: `You are writing a FLUX image generation prompt for a portfolio card background.

CORE PRINCIPLE: This image is seen by the brand's CLIENTS. It must show the outcome or experience they gain from this service — their world after engaging with this brand. The aspiration must be specific and honest: rooted in what this brand concretely delivers. A homeowner in a beautifully landscaped garden, a business owner confidently navigating their autonomous digital tool — authentic, not generic.

RENDERING STYLE:
- Photorealistic editorial photography — real materials, real light, real textures
- Shallow depth of field, natural or studio lighting
- The brand's identity is expressed through the CLIENT'S transformed environment and COLOR

CRITICAL RULES:
- Brand color ${themeSource} dominates (60–70% of frame) as the natural color of the client's environment
- ${isDark ? "Dark, moody, dramatic lighting — cinematic depth" : "Soft natural light, airy and warm — depth from texture and composition"}
- Left third: relatively open for title overlay
- The device is the PRIMARY visual element — it must occupy at least 20–25% of the image and be in sharp focus
- Human presence is welcome (hands, partial arm, relaxed posture); avoid clichéd success props (luxury watch, yacht, tropical beach, generic marble desk)
- The scene must be unmistakably specific to THIS brand's value — not interchangeable with any other service
- NO readable text, labels, or signs
- NO storefronts or building facades
- English only, natural prose, max 180 words
- Start with: "${title} — "
- Output the prompt ONLY`,
        },
        {
          role: "user",
          content: `Brand: "${title}"

Client aspiration / outcome: ${analysis.brandAtmosphere}
Aspirational environment (what the client's world looks like): ${JSON.stringify(analysis.brandPhysicalMaterials)}
Emotional register (client perspective): ${analysis.emotionalKeywords.join(", ")}
Photographic mood translations: ${analysis.emotionVisualTranslations.join(", ")}
Composition: ${analysis.foregroundDescriptor} / ${analysis.midgroundDescriptor} / ${analysis.backgroundDescriptor}
Color strategy: ${analysis.colorDominanceApproach}
Complementary tones: ${analysis.complementaryTones.join(", ")}

Write the FLUX photorealistic aspirational background prompt now.`,
        },
      ],
      temperature: 0.8,
    }),
  });

  if (!res.ok)
    throw new Error(
      `Background prompt API error ${res.status}: ${await res.text()}`,
    );

  const data = (await res.json()) as {
    choices: [{ message: { content: string } }];
  };
  const prompt = data.choices[0].message.content?.trim();
  if (!prompt)
    throw new Error("Empty response from background prompt crafting");
  return prompt;
}

// ─── Étape 1 : Génération FLUX (base atmosphérique) ──────────────────────────

async function generateBaseImage(
  apiKey: string,
  prompt: string,
): Promise<Buffer> {
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
    throw new Error(`FLUX generation error ${res.status}: ${await res.text()}`);
  return extractImageBuffer(await res.json());
}

/// ─── Chemin B : Prompt Gemini (fond + assets en une passe) ──────────────────

async function craftBackgroundWithAssetsPrompt(
  apiKey: string,
  analysis: BrandAnalysis,
  meta: { title: string; themeSource: string; isDark: boolean },
): Promise<string> {
  const { title, themeSource, isDark } = meta;

  const assetList = [
    analysis.includeLogo ? "brand logo" : null,
    analysis.includeScreenshot ? "website screenshot" : null,
  ].filter(Boolean).join(" and ");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "anthropic/claude-sonnet-4-5",
      messages: [
        {
          role: "system",
          content: `You are writing a generation instruction for an image model that receives reference images (${assetList}) and generates a complete photorealistic portfolio card background from scratch.

The model sees the provided images and plans the full composition from the start — assets are NOT added afterwards.

CORE PRINCIPLE: This image is seen by the brand's CLIENTS. It must show the experience or outcome they gain — their world transformed by this service. The aspiration must be specific and honest: rooted in what this brand concretely delivers, not generic lifestyle imagery.

RULES:
- Photorealistic, editorial lifestyle photography — never illustrated or flat design
- Brand color ${themeSource} dominates (60–70% of frame) as the natural color of the CLIENT's environment
- ${isDark ? "Dark, moody, dramatic lighting" : "Natural soft light — depth from texture and composition, never pure white"}
- Left third: relatively open, space for title overlay
- Assets appear as physical objects naturally part of the scene (correct perspective, lighting, shadows)
- The device is the PRIMARY visual element — screen clearly legible, occupying at least 20–25% of the image surface, slightly angled for depth
- Human presence is welcome (hands, partial arm, relaxed posture); avoid clichéd success props (luxury watch, yacht, tropical beach, generic marble desk)
- The scene must be unmistakably tied to THIS brand's specific value — not interchangeable with any other service
- NO readable text/signs, NO faces shown directly
- 150 words max, natural prose, English only
- Output the instruction ONLY`,
        },
        {
          role: "user",
          content: `Brand: "${title}"
Client aspiration / outcome: ${analysis.brandAtmosphere}
Aspirational world (materials, environments): ${JSON.stringify(analysis.brandPhysicalMaterials)}
Emotional register (client perspective): ${analysis.emotionalKeywords.join(", ")}
Photographic mood translations: ${analysis.emotionVisualTranslations.join(", ")}
Editorial scene: ${analysis.assetIntegrationNote}
Composition: ${analysis.foregroundDescriptor} / ${analysis.midgroundDescriptor} / ${analysis.backgroundDescriptor}
Color strategy: ${analysis.colorDominanceApproach}

Provided images: ${assetList}

Write the complete scene instruction, embodying the aspirational story described above and integrating the provided assets naturally.`,
        },
      ],
      temperature: 0.8,
    }),
  });

  if (!res.ok) throw new Error(`Background-with-assets prompt API error ${res.status}: ${await res.text()}`);
  const data = await res.json() as { choices: [{ message: { content: string } }] };
  const prompt = data.choices[0].message.content?.trim();
  if (!prompt) throw new Error("Empty response from background-with-assets prompt crafting");
  return prompt;
}

// ─── Chemin B : Génération Gemini (fond + assets en une passe) ───────────────

async function generateWithAssets(
  apiKey: string,
  prompt: string,
  analysis: BrandAnalysis,
  renderPath: string,
  logoSrc: string | undefined,
): Promise<Buffer> {
  const content: ContentItem[] = [];

  if (analysis.includeLogo && logoSrc) {
    const logoBase64 = await loadAsBase64(join("public", logoSrc));
    if (logoBase64) content.push({ type: "image_url", image_url: { url: logoBase64 } });
  }

  if (analysis.includeScreenshot) {
    const screenBase64 = await loadAsBase64(renderPath, "webp");
    if (screenBase64) content.push({ type: "image_url", image_url: { url: screenBase64 } });
  }

  content.push({ type: "text", text: `${prompt}\n\nOutput a high-resolution 16:9 landscape image (target 1920×1080px or higher).` });

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-pro-image-preview",
      messages: [{ role: "user", content }],
      modalities: ["image"],
    }),
  });

  if (!res.ok) throw new Error(`Gemini background-with-assets API error ${res.status}: ${await res.text()}`);
  return extractImageBuffer(await res.json());
}

// ─── Ancien chemin B (plus utilisé) : intégration img2img sur fond FLUX ──────

async function integrateAssets(
  apiKey: string,
  buffer: Buffer,
  analysis: BrandAnalysis,
  renderPath: string,
  logoSrc: string | undefined,
): Promise<Buffer> {
  const hasLogo = analysis.includeLogo && !!logoSrc;
  const hasScreen = analysis.includeScreenshot;

  if (!hasLogo && !hasScreen) return buffer;

  const content: ContentItem[] = [
    {
      type: "image_url",
      image_url: { url: `data:image/webp;base64,${buffer.toString("base64")}` },
    },
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

  instructions.push(
    `DO NOT add any text, people, or new graphical elements beyond what is described.`,
  );
  instructions.push(`Output ONLY the final integrated image.`);

  content.push({ type: "text", text: instructions.join("\n") });

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-pro-image-preview",
      messages: [{ role: "user", content }],
      modalities: ["image"],
    }),
  });

  if (!res.ok)
    throw new Error(
      `Asset integration API error ${res.status}: ${await res.text()}`,
    );
  return extractImageBuffer(await res.json());
}

// ─── Étape 2 : Calque de cadre — généré par Gemini (image) ──────────────────

/**
 * Gemini génère un calque overlay de bords : fond noir + éléments décoratifs
 * en couleur de marque. Sharp composite avec blend "screen" : le noir disparaît,
 * les éléments colorés s'ajoutent en lumière au-dessus du fond.
 *
 * Mis en cache sous debug/${slug}-2-frame-layer.webp — supprimable
 * indépendamment pour forcer une régénération sans relancer l'étape 1.
 */
/**
 * Analyse le fond généré (Sharp, sans appel API) et retourne les 2–3 coins
 * les moins chargés visuellement — ceux où placer la décoration sans couvrir
 * le sujet principal.
 */
async function findAvailableCorners(
  buffer: Buffer,
  devicePosition: BrandAnalysis["devicePosition"] = "none",
): Promise<string[]> {
  const { width = 1920, height = 1080 } = await sharp(buffer).metadata();
  const zw = Math.round(width  * 0.28);
  const zh = Math.round(height * 0.28);

  const zones = [
    { name: "top-left",     left: 0,           top: 0 },
    { name: "top-right",    left: width  - zw,  top: 0 },
    { name: "bottom-left",  left: 0,           top: height - zh },
    { name: "bottom-right", left: width  - zw,  top: height - zh },
  ] as const;

  // Coins préférés selon la position du device (calque à l'opposé)
  const preferredByDevice: Record<BrandAnalysis["devicePosition"], string[]> = {
    "left":         ["top-right", "bottom-right"],
    "center-left":  ["top-right", "bottom-right"],
    "center":       ["top-left",  "bottom-right"],
    "center-right": ["top-left",  "bottom-left"],
    "right":        ["top-left",  "bottom-left"],
    "none":         [],
  };
  const preferred = new Set(preferredByDevice[devicePosition]);

  const scores = await Promise.all(
    zones.map(async ({ name, left, top }) => {
      const { data } = await sharp(buffer)
        .extract({ left, top, width: zw, height: zh })
        .greyscale()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const vals = Array.from(data as Uint8Array);
      const avg  = vals.reduce((s, v) => s + v, 0) / vals.length;
      const variance = vals.reduce((s, v) => s + (v - avg) ** 2, 0) / vals.length;
      // Score luminance+variance (bas = disponible), avec bonus pour coins préférés
      const raw = avg * 0.6 + Math.sqrt(variance) * 0.4;
      return { name, score: preferred.has(name) ? raw * 0.6 : raw };
    }),
  );

  scores.sort((a, b) => a.score - b.score);
  const picked = scores.slice(0, 2);
  if (scores[2].score < scores[1].score * 1.35) picked.push(scores[2]);
  return picked.map(s => s.name);
}

/**
 * Génère le calque de cadre en img2img : Gemini voit le fond existant et place
 * les formes décoratives dans les zones visuellement libres, sans couvrir
 * le device ni le sujet principal.
 *
 * Sortie : image fond noir + formes colorées → composite par blackToAlpha + "over".
 */
async function generateFrameOverlay(
  apiKey: string,
  backgroundBuffer: Buffer,
  color: string,
  frameMotif: BrandAnalysis["frameMotif"],
  analysis: BrandAnalysis,
): Promise<Buffer> {
  const registerCharacter: Record<BrandAnalysis["logoGraphicRegister"], string> = {
    flat:          "precise and clean — solid blobs with smooth contours",
    geometric:     "structured and balanced — bold filled masses",
    handdrawn:     "loose and organic — irregular filled blobs like ink puddles",
    illustrated:   "expressive and varied — large filled paint-like forms",
    minimal:       "calm and airy — a few large solid blobs with generous white space between them",
    abstract:      "free and non-representational — fluid filled forms",
    stencil:       "bold and high-contrast — large solid filled masses",
    photographic:  "natural and grounded — smooth filled organic forms",
  };

  // Fond converti en niveaux de gris : Gemini lit la composition spatiale
  // sans être influencé par les couleurs du fond (ex. orange lhdemenageur → traits orange)
  const bgGrey = await sharp(backgroundBuffer).greyscale().jpeg({ quality: 80 }).toBuffer();
  const bgBase64 = bgGrey.toString("base64");

  const content: ContentItem[] = [
    {
      type: "text",
      text: `You are creating a DECORATION LAYER — a completely independent image with NO visual relationship to the reference image below.

IGNORE the colors, style, textures, lines, and shapes you see in the reference image entirely. The reference image is provided for ONE purpose only: read which corners and edges have no focal subject (no device, no hands, no objects of interest) — those empty zones are where your blobs will go. It is fine — even preferable — to leave 1 or 2 sides of the canvas completely free.

YOUR OUTPUT — a flat graphic poster:
- Solid white (#FFFFFF) background
- 4 to 7 FILLED SOLID BLOBS in exactly this color: ${color}
- Blobs placed at the empty corners/edges you identified, bleeding off the canvas borders
- Each blob = a solid paint puddle or cut paper piece — completely filled inside, zero holes

Shape rules:
- FILLED: the interior of every blob is 100% opaque ${color} — like a sticker
- All edges curved — zero straight lines, zero right angles
- Each blob visibly large — no thin lines, no hair strokes, no small dots
- Total colored area: 15–20% of canvas
- Style: ${registerCharacter[analysis.logoGraphicRegister]}

FORBIDDEN — any of these makes the output unusable:
- Outlines, strokes, contour lines, wire drawings of any kind
- Text, letters, numbers, symbols, logos, icons
- Gradients, textures, shadows, glows
- Reproducing anything visible in the reference image`,
    },
    {
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,${bgBase64}` },
    },
  ];

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-pro-image-preview",
      messages: [{ role: "user", content }],
      modalities: ["image"],
    }),
  });

  if (!res.ok)
    throw new Error(`Frame overlay API error ${res.status}: ${await res.text()}`);

  return extractImageBuffer(await res.json());
}

/**
 * Vectorise un PNG transparent (blobs colorés sur fond transparent) en SVG.
 * Potrace trace les contours des formes opaques → chemins SVG scalables.
 * Le SVG résultant est utilisable directement en overlay CSS responsive.
 */
async function vectorizeLayer(transparentPng: Buffer, color: string): Promise<string> {
  const { data, info } = await sharp(transparentPng)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Converti alpha → greyscale pour potrace : opaque → noir (0), transparent → blanc (255)
  const greyscale = Buffer.alloc(info.width * info.height);
  for (let i = 0; i < greyscale.length; i++) {
    greyscale[i] = data[i * 4 + 3] > 128 ? 0 : 255;
  }

  const bitmapPng = await sharp(greyscale, {
    raw: { width: info.width, height: info.height, channels: 1 },
  }).png().toBuffer();

  return new Promise((resolve, reject) => {
    potraceTrace(bitmapPng, { color, background: "transparent" }, (err, svg) => {
      if (err) reject(err);
      else resolve(svg);
    });
  });
}

async function saveLayerSvg(svg: string, slug: string): Promise<string> {
  const assetPath = join("src", "assets", "backgrounds", `${slug}-frame-layer.svg`);
  await fs.writeFile(assetPath, svg, "utf-8");
  // Copie debug aussi
  await ensureDebugDir();
  await fs.writeFile(join(DEBUG_DIR, `${slug}-2-frame-layer.svg`), svg, "utf-8");
  console.log(`🎨 Frame SVG saved: ${assetPath}`);
  return `../../assets/backgrounds/${slug}-frame-layer.svg`;
}

async function loadLayerDebug(slug: string): Promise<Buffer | null> {
  const p = join(DEBUG_DIR, `${slug}-2-frame-layer.png`);
  try {
    await fs.access(p);
    console.log(`🐛 Reusing frame layer: ${p}`);
    return fs.readFile(p);
  } catch {
    return null;
  }
}

async function saveLayerDebug(buffer: Buffer, slug: string): Promise<void> {
  await ensureDebugDir();
  const p = join(DEBUG_DIR, `${slug}-2-frame-layer.png`);
  await fs.writeFile(p, new Uint8Array(buffer));
  console.log(`🐛 Frame layer saved: ${p}`);
}

/**
 * Extrait la transparence d'un calque fond noir + formes colorées.
 *
 * Algorithme :
 * - Pixels noirs (luma < 15)          → alpha 0 (transparent)
 * - Formes colorées (luma ≥ 80)       → alpha 255 (opaque) + couleur dé-prémultipliée
 * - Bords anti-aliasés (luma 15–80)   → alpha progressif + couleur corrigée
 *
 * La dé-prémultiplication récupère la vraie teinte : un pixel bord sombre
 * (ex. 10,25,60 = bleu mélangé à du noir) redevient (42,106,255) semi-transparent.
 */
async function blackToAlpha(buffer: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const stride = w * 4;
  // Détecte la couleur de fond en échantillonnant les 4 coins
  const corners = [0, (w - 1) * 4, (info.height - 1) * stride, (info.height - 1) * stride + (w - 1) * 4];
  const avgCornerLuma = corners.reduce((s, i) => s + Math.max(data[i], data[i + 1], data[i + 2]), 0) / 4;
  const isLightBg = avgCornerLuma > 128;

  for (let i = 0; i < data.length; i += 4) {
    if (isLightBg) {
      // Fond blanc : blanc/gris = les 3 canaux sont proches et élevés → transparent
      // Couleur vive (ex. orange R:255 G:96 B:29) → min = 29 < 200 → opaque
      const minChannel = Math.min(data[i], data[i + 1], data[i + 2]);
      data[i + 3] = minChannel > 200 ? 0 : 255;
    } else {
      // Fond noir : pixels sombres → transparent
      data[i + 3] = Math.max(data[i], data[i + 1], data[i + 2]) < 30 ? 0 : 255;
    }
  }

  return sharp(Buffer.from(data), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

async function generateFrameLayer(
  apiKey: string,
  buffer: Buffer,
  themeSource: string,
  frameMotif: BrandAnalysis["frameMotif"],
  analysis: BrandAnalysis,
  slug: string,
): Promise<string | undefined> {
  const { width = 1920, height = 1080 } = await sharp(buffer).metadata();

  // Charge ou génère le PNG transparent (cache indépendant du fond)
  const frameWithAlpha =
    (await loadLayerDebug(slug)) ??
    (await (async () => {
      const overlay = await generateFrameOverlay(apiKey, buffer, themeSource, frameMotif, analysis);
      const resized = await sharp(overlay)
        .resize(width, height, { fit: "fill" })
        .toBuffer();
      const transparent = await blackToAlpha(resized);
      await saveLayerDebug(transparent, slug);
      return transparent;
    })());

  // Vectorisation SVG (cache indépendant — supprimable seul pour re-vectoriser)
  const svgAssetPath = join("src", "assets", "backgrounds", `${slug}-frame-layer.svg`);
  try {
    await fs.access(svgAssetPath);
    console.log(`🐛 Reusing frame SVG: ${svgAssetPath}`);
    return `../../assets/backgrounds/${slug}-frame-layer.svg`;
  } catch {
    // pas de cache SVG → vectoriser
  }

  try {
    const svg = await vectorizeLayer(frameWithAlpha, themeSource);
    return await saveLayerSvg(svg, slug);
  } catch (err) {
    console.warn(`⚠️  SVG vectorization failed for ${slug}:`, err);
    return undefined;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function extractImageBuffer(data: any): Promise<Buffer> {
  const message = data.choices?.[0]?.message;
  const content = message?.content;

  const findInArray = (arr: any[]): string | undefined => {
    const item = arr.find(
      (c: any) => c.type === "image_url" || c.type === "image",
    );
    return item?.image_url?.url ?? item?.image?.url ?? item?.url;
  };

  let rawUrl: string | undefined;
  if (Array.isArray(message?.images)) rawUrl = findInArray(message.images);
  else if (Array.isArray(content)) rawUrl = findInArray(content);
  else if (typeof content === "string") rawUrl = content;

  if (!rawUrl)
    throw new Error(
      `No image found in response. message keys: ${Object.keys(message ?? {}).join(", ")}`,
    );

  if (rawUrl.startsWith("data:"))
    return Buffer.from(rawUrl.split(",")[1], "base64");

  const download = await fetch(rawUrl);
  if (!download.ok)
    throw new Error(`Failed to download image: ${download.status}`);
  return Buffer.from(await download.arrayBuffer());
}

async function loadAsBase64(
  filePath: string,
  forceFormat?: "webp" | "png",
): Promise<string | null> {
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
    const mimeType = forceFormat
      ? `image/${forceFormat}`
      : ext === "svg"
        ? "image/png"
        : ext === "jpg"
          ? "image/jpeg"
          : `image/${ext}`;
    return `data:${mimeType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

async function tryEncodeLogoAsContentItem(
  logoSrc: string,
): Promise<ContentItem | null> {
  const url = await loadAsBase64(join("public", logoSrc));
  if (!url) return null;
  return { type: "image_url", image_url: { url } };
}

// ─── Cache debug ──────────────────────────────────────────────────────────────

const DEBUG_DIR = join("src", "assets", "backgrounds", "debug");

async function ensureDebugDir(): Promise<void> {
  await fs.mkdir(DEBUG_DIR, { recursive: true });
}

async function saveDebugStep(
  buffer: Buffer,
  slug: string,
  step: string,
): Promise<void> {
  await ensureDebugDir();
  const outputPath = join(DEBUG_DIR, `${slug}-${step}.webp`);
  await sharp(buffer).webp({ quality: 85 }).toFile(outputPath);
  console.log(`🐛 Debug [${step}]: ${outputPath}`);
}

async function loadImageDebug(
  slug: string,
  step: string,
): Promise<Buffer | null> {
  const p = join(DEBUG_DIR, `${slug}-${step}.webp`);
  try {
    await fs.access(p);
    console.log(`🐛 Reusing [${step}]: ${p}`);
    return fs.readFile(p);
  } catch {
    return null;
  }
}

async function saveJsonDebug<T>(
  slug: string,
  step: string,
  data: T,
): Promise<void> {
  await ensureDebugDir();
  await fs.writeFile(
    join(DEBUG_DIR, `${slug}-${step}.json`),
    JSON.stringify(data, null, 2),
    "utf-8",
  );
}

async function loadJsonDebug<T>(slug: string, step: string): Promise<T | null> {
  const p = join(DEBUG_DIR, `${slug}-${step}.json`);
  try {
    await fs.access(p);
    console.log(`🐛 Reusing [${step}]: ${p}`);
    return JSON.parse(await fs.readFile(p, "utf-8")) as T;
  } catch {
    return null;
  }
}

async function saveTextDebug(
  slug: string,
  step: string,
  text: string,
): Promise<void> {
  await ensureDebugDir();
  await fs.writeFile(join(DEBUG_DIR, `${slug}-${step}.txt`), text, "utf-8");
}

async function loadTextDebug(
  slug: string,
  step: string,
): Promise<string | null> {
  const p = join(DEBUG_DIR, `${slug}-${step}.txt`);
  try {
    await fs.access(p);
    console.log(`🐛 Reusing [${step}]: ${p}`);
    return fs.readFile(p, "utf-8");
  } catch {
    return null;
  }
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
