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

  // ── Étape 2 : Cadre abstrait généré par LLM ──────────────────────────────
  // debug/${slug}-2-frame-layer.svg  → SVG brut (supprimable → force regen LLM)
  // debug/${slug}-2-frame-layer.png  → PNG rendu  (supprimable → force re-render)
  // debug/${slug}-3-composite.webp   → résultat final avant export
  buffer = await applyFrame(apiKey, buffer, themeSource, analysis.frameMotif, analysis, slug);
  await saveDebugStep(buffer, slug, "3-composite");

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

  // Univers de marque (utilisé pour l'étape 1 — valeurs/atmosphère)
  brandPhysicalMaterials: z.array(z.string()),
  brandAtmosphere: z.string(),

  // Registre émotionnel
  emotionalKeywords: z.array(z.string()),
  emotionVisualTranslations: z.array(z.string()),

  // Décision assets (étape 2)
  includeScreenshot: z.boolean(),
  includeLogo: z.boolean(),
  assetIntegrationNote: z.string(),

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
4. Whether a website screenshot should be integrated as a device mockup. Set true if the brand's physical environment naturally contains surfaces or settings where a device could be casually placed. Set false if no credible surface exists in this brand's world.
5. Whether the logo should be integrated into the scene. Set true if the logo has a distinctive graphic register (illustrated, stencil, handdrawn, geometric) that contributes visually to the composition. Set false if it is a plain wordmark that would look pasted-on.
6. Describe a precise editorial scenario for placing the device: choose the device type (laptop, tablet or phone) that fits the brand lifestyle, and place it on a surface that belongs to the client's world — not the tradesperson's workspace. Think lifestyle photography: where would a client or admirer of this brand naturally have a screen nearby? The scenario must feel authentic to the brand atmosphere, not staged or technical. Then describe how the logo could appear as a physical element in the same scene.
7. How to make ${themeSource} dominant as the natural color of the photographed materials/environment (60–70% of frame) — not as a filter
8. Describe concrete foreground, midground, and background photographic elements
9. Choose the abstract decorative motif for the frame overlay — pick the one that best translates this brand's visual vocabulary into non-figurative form: "botanical" (nature/organic/plant world), "paint_splash" (creative/artisanal/expressive), "flowing_wave" (digital/fluid/modern), "geometric_shard" (technical/precise/architectural), "organic_blob" (friendly/human/rounded), "dot_cluster" (pattern-based/data/playful)
10. Write a short alt text in FRENCH (max 12 words) describing the visual content of the generated background — what will be photographically represented (e.g. "Produits bio en vrac sur fond vert-sauge texturé")

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

RULES:
- Photorealistic scene, never illustrated or flat design
- Brand color ${themeSource} dominates (60–70% of frame) as natural material/environment color
- ${isDark ? "Dark, moody, dramatic lighting" : "Natural soft light — depth from texture and composition, never pure white"}
- Left third: minimal, space for title overlay
- Assets appear as physical objects naturally belonging to the scene (correct perspective, lighting, shadows)
- The device rests on a surface that belongs to the CLIENT's world, not a trade workspace — think lifestyle editorial photography
- The screen must be clearly legible and occupy a significant portion of the frame (roughly 40–50% of image width), slightly angled for depth — never small or tucked away
- NO text, labels, signs, readable writing, people, faces, or hands
- 150 words max, natural prose, English only
- Output the instruction ONLY`,
        },
        {
          role: "user",
          content: `Brand: "${title}"
Physical world: ${JSON.stringify(analysis.brandPhysicalMaterials)}
Atmosphere: ${analysis.brandAtmosphere}
Emotional keywords: ${analysis.emotionalKeywords.join(", ")}
Photographic translations: ${analysis.emotionVisualTranslations.join(", ")}
Composition: ${analysis.foregroundDescriptor} / ${analysis.midgroundDescriptor} / ${analysis.backgroundDescriptor}
Color strategy: ${analysis.colorDominanceApproach}
Asset placement: ${analysis.assetIntegrationNote}

Provided images: ${assetList}

Write the complete scene instruction, describing the full composition including how the assets appear in it.`,
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
async function findAvailableCorners(buffer: Buffer): Promise<string[]> {
  const { width = 1920, height = 1080 } = await sharp(buffer).metadata();
  const zw = Math.round(width  * 0.28);
  const zh = Math.round(height * 0.28);

  const zones = [
    { name: "top-left",     left: 0,           top: 0 },
    { name: "top-right",    left: width  - zw,  top: 0 },
    { name: "bottom-left",  left: 0,           top: height - zh },
    { name: "bottom-right", left: width  - zw,  top: height - zh },
  ] as const;

  const scores = await Promise.all(
    zones.map(async ({ name, left, top }) => {
      const { data } = await sharp(buffer)
        .extract({ left, top, width: zw, height: zh })
        .greyscale()
        .raw()
        .toBuffer({ resolveWithObject: true });
      // Score = luminosité moyenne × variance (zones très sombres ET uniformes = plus disponibles)
      const vals = Array.from(data as Uint8Array);
      const avg  = vals.reduce((s, v) => s + v, 0) / vals.length;
      const variance = vals.reduce((s, v) => s + (v - avg) ** 2, 0) / vals.length;
      // score bas = zone sombre et peu détaillée → idéale pour le calque
      return { name, score: avg * 0.6 + Math.sqrt(variance) * 0.4 };
    }),
  );

  scores.sort((a, b) => a.score - b.score);
  // 2 coins toujours, parfois 3 (quand le 3e est proche du 2e)
  const picked = scores.slice(0, 2);
  if (scores[2].score < scores[1].score * 1.35) picked.push(scores[2]);
  return picked.map(s => s.name);
}

async function generateFrameOverlay(
  apiKey: string,
  w: number,
  h: number,
  color: string,
  frameMotif: BrandAnalysis["frameMotif"],
  analysis: BrandAnalysis,
  placementCorners: string[],
): Promise<Buffer> {
  // Caractère visuel selon le registre graphique — qualité, pas exemple de forme
  const registerCharacter: Record<BrandAnalysis["logoGraphicRegister"], string> = {
    flat:          "precise, clean",
    geometric:     "structured, balanced",
    handdrawn:     "loose, organic",
    illustrated:   "expressive, varied",
    minimal:       "restrained, simple",
    abstract:      "non-representational, free",
    stencil:       "bold, high-contrast",
    photographic:  "natural, grounded",
  };

  const cornersLabel = placementCorners.join(" and ");

  const prompt = `${w}×${h}px image. Pure black (#000000) background. Single color: ${color}.

Abstract ${color} shapes placed ONLY at these specific corners: ${cornersLabel}. Shapes bleed off the canvas edges at those corners. All other corners and the center remain empty black — black must be clearly dominant.

Shape character: ${registerCharacter[analysis.logoGraphicRegister]}.
Personality: ${analysis.emotionalKeywords.join(", ")}.
Brand essence to abstractly evoke through form and rhythm (do not illustrate literally): ${analysis.brandAtmosphere}.
Abstract formal inspiration (translate into pure shape, not symbol): ${analysis.logoVisualSymbol}.

Composition:
- 5 to 10 distinct shapes, each substantial — no fragmented small details
- Total colored area: at most 15–20% of the canvas
- Shapes may carry a vague impression or mood but must not depict any recognizable specific object

Strict visual rules — no exceptions:
- All shape edges must be curved — no straight lines, no right angles, no sharp corners.
- Flat solid ${color} only. No texture, no grain, no paper or fabric effect.
- No shadow, no outline, no stroke.
- No gradient, no glow, no blur, no 3D or depth effect.`;


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
      image_config: { aspect_ratio: "16:9", image_size: "1K" },
    }),
  });

  if (!res.ok)
    throw new Error(`Frame overlay API error ${res.status}: ${await res.text()}`);

  return extractImageBuffer(await res.json());
}

async function loadLayerDebug(slug: string): Promise<Buffer | null> {
  const p = join(DEBUG_DIR, `${slug}-2-frame-layer.webp`);
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
  const p = join(DEBUG_DIR, `${slug}-2-frame-layer.webp`);
  await sharp(buffer).webp({ quality: 90 }).toFile(p);
  console.log(`🐛 Frame layer saved: ${p}`);
}

async function applyFrame(
  apiKey: string,
  buffer: Buffer,
  themeSource: string,
  frameMotif: BrandAnalysis["frameMotif"],
  analysis: BrandAnalysis,
  slug: string,
): Promise<Buffer> {
  const { width = 1920, height = 1080 } = await sharp(buffer).metadata();

  // Analyse les coins du fond pour trouver les zones disponibles
  const placementCorners = await findAvailableCorners(buffer);
  console.log(`🎨 Frame placement corners for ${slug}: ${placementCorners.join(", ")}`);

  // Charge ou génère le calque (supprimable indépendamment dans debug)
  const rawFrame =
    (await loadLayerDebug(slug)) ??
    (await (async () => {
      const overlay = await generateFrameOverlay(apiKey, width, height, themeSource, frameMotif, analysis, placementCorners);
      const resized = await sharp(overlay)
        .resize(width, height, { fit: "fill" })
        .toBuffer();
      await saveLayerDebug(resized, slug);
      return resized;
    })());

  // Convertit le fond noir en alpha transparent.
  // Seuil dur (< 35 → transparent) pour éliminer le halo noir aux bords des formes.
  const { data, info } = await sharp(rawFrame)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const brightness = Math.max(data[i], data[i + 1], data[i + 2]);
    data[i + 3] = brightness < 35 ? 0 : 255;
  }

  const frameWithAlpha = await sharp(Buffer.from(data), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();

  // "over" blend : les formes colorées s'appliquent à pleine opacité sur le fond
  return sharp(buffer)
    .composite([{ input: frameWithAlpha, blend: "over" }])
    .toBuffer();
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
