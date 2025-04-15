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

const recordPageScrollWithAnimations = async (url: string, outputPath: string) => {
    // Lancement du navigateur
    const browser = await puppeteer.launch({
        headless: false, // Laisser visible pour tester si besoin
    });
    const page = await browser.newPage();

    // Configuration de la taille de la fenêtre
    await page.setViewport({
        width: 1440
        , height: 900
    });

    // Ouvrir la page souhaitée
    await page.goto(url, {waitUntil: "networkidle2"});

    // Initialiser l'enregistreur vidéo
    const recorder = new PuppeteerScreenRecorder(page, {
        followNewTab: true, // Enregistre l’activité dans les nouveaux onglets (si besoin)
        fps: 90, // Taux d'images par seconde
        videoFrame: {
            width: 1440,
            height: 900,
        },
    });

    // Démarrer l'enregistrement
    await recorder.start(outputPath);

    // Scénariser le scroll dynamique pour capturer les animations
    await page.evaluate(async () => {
        const delay = (time) => new Promise((resolve) => setTimeout(resolve, time));
        const ease = (t) => t * (2 - t);

        // Scroll personnalisé : section par section
        const sections = document.querySelectorAll("section"); // Par exemple, des sections avec `data-section`
        console.log(sections.length)
        const max = 5
        const totalSections = sections.length;

        // await delay(250);
        // for (const [index, section] of Array.from(sections).entries()) {
        //     if (totalSections > max && index !== 0 && index !== totalSections - 1) {
        //         if (index % Math.ceil(totalSections / max) !== 0)
        //             continue
        //     }
        //
        //
        //     // await smoothScrollTo(section, 750);
        //     section.scrollIntoView({
        //         behavior: 'smooth', // Scroll fluide
        //         block: 'start',     // Scroll pour aligner au haut de la section
        //     });
        //
        //     // Scroll smooth vers chaque section
        //     await delay(1750); // Pause pour laisser les animations se jouer
        // }

        // if (!sections || sections.length === 0) {

        for (let i = 0; i < document.body.scrollHeight; i += 900) {
            window.scrollTo({top: i, behavior: "smooth"});
            const isLastIteration = i + 900 >= document.body.scrollHeight;
            if (!isLastIteration) {
                await delay(1250); // Pause pour capturer les animations seulement si ce n'est pas la fin
            } else {
                await delay(500); // Pause pour laisser les animations se jouer
            }
        }
        // }

        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
        await delay(750);
    });

    // Arrêter l'enregistrement après le scroll
    await recorder.stop();

    // Fermer le navigateur
    await browser.close();
};

export default function customIntegration(): AstroIntegration {
    return {
        name: 'astro-custom-integration',
        hooks: {
            'astro:config:setup': async ({logger}) => {

                const realisationsDir = join('src', 'data', 'realisation'); // Répertoire des réalisations
                const mdxFiles = await getAllMDXFiles(realisationsDir); // Récupérer tous les fichiers MDX
                const realisationsData: any = await getMDXMetadata(realisationsDir, mdxFiles); // Extraire les métadonnées

                for (const {website: url, slug} of realisationsData) {
                    if (!url) continue;

                    const videoPath = join('public', 'videos', 'renders', `${slug}.mp4`);
                    try {
                        await fs.access(videoPath); // Vérifier si le fichier vidéo existe
                        logger.info(`✅ Vidéo trouvée pour "${slug}" : ${videoPath}`);
                    } catch {
                        logger.info(`❌ Aucune vidéo trouvée pour "${slug}", création en cours...`);
                        await recordPageScrollWithAnimations(url, videoPath);
                        logger.info(`✅ Vidéo créée pour "${slug}" : ${videoPath}`);


                        extractFirstFrameAsWebP(videoPath, `./src/assets/renders/${slug}.webp`, slug)
                            .then(() => console.log('✅ Le process est terminé.'))
                            .catch(err => console.error('❌ Une erreur est survenue durant le process.', err));

                        const videoOptimizer = ffmpeg(videoPath) // Vidéo source
                            .videoCodec('libvpx-vp9')
                            .noAudio()
                            .format('webm') // Format de sortie
                            .fps(30)
                            .addOption('-crf', '28')
                            .addOption('-b:v', '1M')
                            .addOption('-maxrate', '4M')
                            .addOption('-bufsize', '2M')
                            .addOption('-pix_fmt', 'yuv420p')
                            .addOption('-preset', 'slower')
                            .on('end', () => console.log('Vidéo optimisée avec succès !'))
                            .on('error', (err) => console.error('Une erreur s\'est produite :', err))


                        videoOptimizer.output(videoPath.replace('.mp4', '-720.webm'))
                            .size('1280x720')

                            .run();
                        videoOptimizer.output(videoPath.replace('.mp4', '-480.webm'))
                            .size('720x480')
                            .run();

                    }
                }
            },
        },
    };
}