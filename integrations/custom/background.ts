import {promises as fs} from 'fs';
import path from 'node:path';
import {join} from 'path';
import sharp from 'sharp';

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
 * Pipeline :
 *   1. claude-sonnet-4-5 (vision) — analyse le render + logo, rédige un prompt
 *      d'image generation précis et orienté "creative agency portfolio".
 *   2. flux-1.1-pro (text-to-image) — génère le mockup haute qualité.
 *   3. sharp — convertit et sauvegarde en webp.
 *
 * Retourne `/images/realisations/{slug}-background.webp` ou null si les
 * prérequis sont manquants (clé API absente, render non encore généré).
 */
export async function generateBackgroundMockup(options: BackgroundMockupOptions): Promise<string | null> {
    const {slug, title, description, themeSource, isDark, renderPath, logoSrc, apiKey} = options;

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

    const visionContent = await buildVisionContent({title, description, themeSource, isDark, renderPath, logoSrc});
    const imagePrompt   = await analyzeAndCraftPrompt(apiKey, visionContent);

    console.log(`🖊️  Crafted prompt for ${slug}:\n${imagePrompt}\n`);

    const imageBuffer = await generateImage(apiKey, imagePrompt);
    return saveAsWebP(imageBuffer, slug);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ContentItem =
    | {type: 'text'; text: string}
    | {type: 'image_url'; image_url: {url: string}};

// ─── Vision step : Claude Sonnet analyse et rédige le prompt ─────────────────

async function buildVisionContent({
    title,
    description,
    themeSource,
    isDark,
    renderPath,
    logoSrc,
}: Omit<BackgroundMockupOptions, 'slug'>): Promise<ContentItem[]> {
    const renderBase64 = (await fs.readFile(renderPath)).toString('base64');

    const content: ContentItem[] = [
        {
            type: 'text',
            text: buildVisionPrompt(title, description, themeSource, isDark),
        },
        {
            type: 'image_url',
            image_url: {url: `data:image/webp;base64,${renderBase64}`},
        },
    ];

    if (logoSrc) {
        const logoItem = await tryEncodeLogoAsContentItem(logoSrc);
        if (logoItem) {
            content.push({type: 'text', text: 'Brand logo for reference:'});
            content.push(logoItem);
        }
    }

    return content;
}

function buildVisionPrompt(title: string, description: string, themeSource: string, isDark: boolean): string {
    return `You are the art director of a high-end digital portfolio agency.
Your task: write a FLUX image generation prompt for the background card of the project "${title}".

You have three inputs: the website screenshot, the brand logo, and the project description below.
Study them carefully before writing the prompt.

━━ PROJECT IDENTITY ━━
Title       : ${title}
Description : ${description}
Brand color : ${themeSource}
Theme       : ${isDark ? 'dark' : 'light'}

━━ YOUR 3-STEP PROCESS ━━

STEP 1 — EXTRACT THE VISUAL SYMBOL
Look at the logo carefully. Identify its core visual element (a bird, a wave, a geometric shape,
an animal, an abstract mark…). This symbol is the SOUL of the brand. It can appear in the image
as an ATMOSPHERIC ELEMENT — a soft silhouette, a partial defocused shape, a shadow, a reflection —
never as a recognizable brand asset. If the logo contains a living element (bird, animal), it can
be present in nature, in motion, partially cropped, softly out of focus.

STEP 2 — BUILD THE COLOR FIELD
${themeSource} must be the DOMINANT color (60–70% of the frame), not a subtle accent.
It should appear as: sky gradient, tinted light, color wash, material hue, or atmospheric layer.
Complement with warm neutrals and the natural tones visible in the screenshot's palette.

STEP 3 — TRANSLATE VALUES INTO ATMOSPHERE
From the description, extract 3 emotional words that define this brand.
Translate each into a VISUAL ATMOSPHERE element — not a literal object.
Example: "local" → morning light quality, worn natural textures
         "cooperative" → warmth, softness, human-scale light
         "coastal" → salt-air haze, horizon depth, sea-light color temperature

━━ THE RESULTING IMAGE MUST ━━
  • Be a full-bleed 16:9 atmospheric composition
  • Have 2–3 depth planes (foreground texture → mid color field → background gradient)
  • Be ${isDark ? 'deep and luminous — dark field with glowing accents' : 'airy and bright — light field with tonal depth and gentle shadow'}
  • Leave the left third open (card title overlays there)
  • Feel SPECIFIC to this brand — someone who knows the project should recognize it

━━ HARD PROHIBITIONS ━━
  • NO text, signs, labels, numbers, or readable writing of any kind
  • NO storefronts, buildings, shop interiors, or streets
  • NO people or faces
  • NO generic stock clichés (sunsets on beaches, handshakes, laptops on desks)
  • NO brand names or trademarks

━━ FORMAT ━━
English only. Present tense. Comma-separated descriptors. Sensory and precise.
Max 200 words. Output the image generation prompt only — no preamble, no explanation.`;
}

async function tryEncodeLogoAsContentItem(logoSrc: string): Promise<ContentItem | null> {
    const logoPath = join('public', logoSrc);
    try {
        await fs.access(logoPath);
        const ext = path.extname(logoPath).slice(1).toLowerCase();

        const buffer   = ext === 'svg'
            ? await sharp(logoPath).png().toBuffer()
            : await fs.readFile(logoPath);
        const mimeType = ext === 'svg' ? 'image/png'
            : ext === 'jpg'            ? 'image/jpeg'
            :                            `image/${ext}`;

        return {type: 'image_url', image_url: {url: `data:${mimeType};base64,${buffer.toString('base64')}`}};
    } catch {
        return null;
    }
}

async function analyzeAndCraftPrompt(apiKey: string, content: ContentItem[]): Promise<string> {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json'},
        body: JSON.stringify({
            model: 'anthropic/claude-sonnet-4-5',
            messages: [{role: 'user', content}],
            temperature: 0.7,
        }),
    });

    if (!res.ok) throw new Error(`Vision API error ${res.status}: ${await res.text()}`);

    const data = await res.json() as {choices: [{message: {content: string}}]};
    return data.choices[0].message.content.trim();
}

// ─── Image generation step : FLUX 2 Pro ──────────────────────────────────────

async function generateImage(apiKey: string, prompt: string): Promise<Buffer> {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json'},
        body: JSON.stringify({
            model: 'black-forest-labs/flux.2-pro',
            messages: [{role: 'user', content: prompt}],
            modalities: ['image'],
            image_config: {aspect_ratio: '16:9', image_size: '2K'},
        }),
    });

    if (!res.ok) throw new Error(`Image generation error ${res.status}: ${await res.text()}`);

    const data = await res.json() as any;
    const content = data.choices?.[0]?.message?.content;

    // Extraire l'URL ou le base64 selon le format retourné par le provider.
    // OpenRouter/FLUX place l'image dans message.images (non-standard),
    // les autres providers utilisent message.content (tableau ou string).
    let rawUrl: string | undefined;
    const message = data.choices?.[0]?.message;

    const findInArray = (arr: any[]): string | undefined => {
        const item = arr.find((c: any) => c.type === 'image_url' || c.type === 'image');
        return item?.image_url?.url ?? item?.image?.url ?? item?.url;
    };

    if (Array.isArray(message?.images)) {
        rawUrl = findInArray(message.images);
    } else if (Array.isArray(content)) {
        rawUrl = findInArray(content);
    } else if (typeof content === 'string') {
        rawUrl = content;
    }

    if (!rawUrl) {
        throw new Error(`No image found in response. message keys: ${Object.keys(message ?? {}).join(', ')}`);
    }

    // data URL (base64 inline) → Buffer direct, sans fetch
    if (rawUrl.startsWith('data:')) {
        const base64 = rawUrl.split(',')[1];
        return Buffer.from(base64, 'base64');
    }

    // URL HTTP → téléchargement
    const download = await fetch(rawUrl);
    if (!download.ok) throw new Error(`Failed to download image: ${download.status}`);
    return Buffer.from(await download.arrayBuffer());
}

// ─── Save ─────────────────────────────────────────────────────────────────────

async function saveAsWebP(imageBuffer: Buffer, slug: string): Promise<string> {
    const outputDir  = join('public', 'images', 'realisations');
    const outputPath = join(outputDir, `${slug}-background.webp`);

    await fs.mkdir(outputDir, {recursive: true});
    await sharp(imageBuffer).webp({quality: 90}).toFile(outputPath);

    console.log(`✅ Background saved: ${outputPath}`);
    return `/images/realisations/${slug}-background.webp`;
}
