// fichier: astro-custom-integration.ts
// fichier: astro-custom-integration.ts
import type {AstroIntegration} from 'astro';
import {promises as fs} from "fs";
import matter from 'gray-matter';
import {join} from 'path';
import puppeteer from "puppeteer";
import {PuppeteerScreenRecorder} from "puppeteer-screen-recorder";
import ffmpeg from 'fluent-ffmpeg';
import path from "node:path";

// Prisma runtime models export (no DB access needed)


async function getAllMDXFiles(realisationsDir: string) {
    try {
        const files = await fs.readdir(realisationsDir);
        const mdxFiles = files.filter(file => file.endsWith('.mdx'));
        console.log('📄 Found MDX files:', mdxFiles);
        return mdxFiles;
    } catch (error) {
        console.error('❌ Error reading MDX files:', error);
        return [];
    }
}

const extractFirstFrameAsWebP = async (videoPath: string, outputImagePath: string, imageName = "frame_%d"): Promise<void> => {
    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .on('start', () => {
                console.log(`📹 Début du processus: Extraction depuis ${videoPath}`);
            })
            .on('end', () => {
                console.log(`✅ Extraction terminée : Image enregistrée sous ${outputImagePath}`);
                resolve();
            })
            .on('error', (err) => {
                console.error(`❌ Erreur lors de l'extraction :`, err);
                reject(err);
            })
            // Extraire uniquement le premier frame à 0 seconde
            .screenshots({
                timestamps: ['00:00:00.000'], // Temps de la première image
                filename: imageName + '.webp',   // Nom temporaire de l'image générée
                folder: path.dirname(outputImagePath),
                size: '1440x900'             // Optionnel : taille
            })
            .toFormat('webp');
    });
};


/**
 * Récupère les métadonnées depuis les fichiers MDX.
 */
async function getMDXMetadata(dir: string, files: string[]) {
    const metadata = [];
    for (const file of files) {
        const filePath = join(dir, file); // Crée un chemin vers le fichier
        try {
            const content = await fs.readFile(filePath, 'utf-8'); // Lire le contenu du fichier
            const {data} = matter(content); // Extraire les métadonnées avec gray-matter
            metadata.push({
                ...data, // Ajoute les métadonnées
                slug: file.replace('.mdx', ''), // Génère un slug basé sur le nom du fichier
            });
        } catch (error) {
            console.error(`❌ Error parsing metadata from file ${file}:`, error);
        }
    }
    return metadata;
}

const recordPageScrollWithAnimations = async (url: string, outputPath: string, height: number = 1080) => {
    console.log(`🎥 Recording ${url} at 1920x${height}`);
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            `--window-size=1920,${height}`,
            '--start-maximized'
        ],
    });
    const page = await browser.newPage();

    await page.setViewport({
        width: 1920,
        height: height,
        deviceScaleFactor: 1
    });

    await page.goto(url, {waitUntil: "networkidle2"});

    const recorder = new PuppeteerScreenRecorder(page, {
        followNewTab: true,
        fps: 90,
        videoFrame: {
            width: 1920,
            height: height,
        },
    });

    await recorder.start(outputPath);

    await page.evaluate(async () => {
        const delay = (time) => new Promise((resolve) => setTimeout(resolve, time));

        for (let i = 0; i < document.body.scrollHeight; i += 900) {
            window.scrollTo({top: i, behavior: "smooth"});
            const isLastIteration = i + 900 >= document.body.scrollHeight;
            if (!isLastIteration) {
                await delay(1250);
            } else {
                await delay(500);
            }
        }

        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
        await delay(750);
    });

    await recorder.stop();
    await browser.close();
};

export default function customIntegration(): AstroIntegration {
    return {
        name: 'astro-custom-integration',
        hooks: {
            'astro:config:setup': async ({logger}) => {


                const realisationsDir = join('src', 'data', 'realisation');
                const mdxFiles = await getAllMDXFiles(realisationsDir);
                const realisationsData: any = await getMDXMetadata(realisationsDir, mdxFiles);

                const validRealisations = realisationsData.filter(({website}) => website);
                const totalCount = validRealisations.length;
                logger.info(`🎬 Starting video processing for ${totalCount} projects`);

                for (const [index, {website: url, slug}] of validRealisations.entries()) {
                    const current = index + 1;
                    logger.info(`\n📊 Processing ${current}/${totalCount}: ${slug}`);

                    const videoOptimizer = (output: string, inputPath: string) => ffmpeg(inputPath)
                        .videoCodec('libvpx-vp9')
                        .noAudio()
                        .format('webm')
                        .fps(30)
                        .addOption('-crf', '28')
                        .addOption('-b:v', '1M')
                        .addOption('-maxrate', '4M')
                        .addOption('-bufsize', '2M')
                        .addOption('-pix_fmt', 'yuv420p')
                        .addOption('-preset', 'slower')
                        .on('end', () => console.log(`✅ Optimization complete: ${output}`))
                        .on('error', (err) => console.error(`❌ Optimization error: ${output}`, err))
                        .output(output);

                    const videoPath = join('public', 'videos', 'renders', `${slug}.mp4`);
                    const maltVideoPath = join('public', 'videos', 'renders', `${slug}-malt.mp4`);

                    let recordingsNeeded = 0;
                    let optimizationsNeeded = 0;

                    try {
                        await fs.access(videoPath);
                        logger.info(`✅ Standard video exists: ${slug}`);
                    } catch {
                        recordingsNeeded++;
                        logger.info(`🎬 Recording standard video (1920x1080): ${slug}`);
                        await recordPageScrollWithAnimations(url, videoPath, 1080);
                        logger.info(`✅ Standard recording complete: ${slug}`);

                        optimizationsNeeded += 3;
                        extractFirstFrameAsWebP(videoPath, `./src/assets/renders/${slug}.webp`, slug)
                            .then(() => console.log(`✅ Thumbnail created: ${slug}`))
                            .catch(err => console.error(`❌ Thumbnail error: ${slug}`, err));

                        videoOptimizer(videoPath.replace('.mp4', '-720.webm'), videoPath)
                            .size('1280x720')
                            .run();
                        videoOptimizer(videoPath.replace('.mp4', '-480.webm'), videoPath)
                            .size('720x480')
                            .run();
                    }

                    try {
                        await fs.access(maltVideoPath);
                        logger.info(`✅ Malt video exists: ${slug}`);
                    } catch {
                        recordingsNeeded++;
                        logger.info(`🎬 Recording Malt video (1920x1380): ${slug}`);
                        await recordPageScrollWithAnimations(url, maltVideoPath, 1380);
                        logger.info(`✅ Malt recording complete: ${slug}`);

                        optimizationsNeeded += 2;
                        ffmpeg(maltVideoPath)
                            .screenshots({
                                timestamps: ['00:00:00.000'],
                                filename: `${slug}-malt.webp`,
                                folder: './src/assets/renders',
                                size: '522x375'
                            })
                            .toFormat('webp')
                            .on('end', () => console.log(`✅ Malt preview created: ${slug}`))
                            .on('error', (err) => console.error(`❌ Malt preview error: ${slug}`, err));

                        videoOptimizer(maltVideoPath.replace('.mp4', '.webm'), maltVideoPath)
                            .size('1920x1380')
                            .run();
                    }

                    const remaining = totalCount - current;
                    if (recordingsNeeded > 0 || optimizationsNeeded > 0) {
                        logger.info(`📈 ${slug}: ${recordingsNeeded} recordings, ${optimizationsNeeded} optimizations queued`);
                    }
                    if (remaining > 0) {
                        logger.info(`⏳ ${remaining} projects remaining`);
                    }
                }
                logger.info(`🎉 All video processing complete!`);
            },
        },
    };
}