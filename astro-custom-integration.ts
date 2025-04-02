// fichier: astro-custom-integration.ts
// fichier: astro-custom-integration.ts
import type {AstroIntegration} from 'astro';
import {promises as fs} from "fs";
import matter from 'gray-matter';

import {join} from 'path';
import puppeteer from "puppeteer";
import {PuppeteerScreenRecorder} from "puppeteer-screen-recorder";

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
    await page.setViewport({width: 1280, height: 720});

    // Ouvrir la page souhaitée
    await page.goto(url, {waitUntil: "networkidle2"});

    // Initialiser l'enregistreur vidéo
    const recorder = new PuppeteerScreenRecorder(page, {
        followNewTab: true, // Enregistre l’activité dans les nouveaux onglets (si besoin)
        fps: 30, // Taux d'images par seconde
        videoFrame: {
            width: 1280,
            height: 720,
        },
    });

    // Démarrer l'enregistrement
    await recorder.start(outputPath);

    // Scénariser le scroll dynamique pour capturer les animations
    await page.evaluate(async () => {
        const delay = (time) => new Promise((resolve) => setTimeout(resolve, time));

        // Scroll personnalisé : section par section
        const sections = document.querySelectorAll("[data-section]"); // Par exemple, des sections avec `data-section`
        for (const section of sections) {
            section.scrollIntoView({behavior: "smooth"}); // Scroll smooth vers chaque section
            await delay(2000); // Pause pour laisser les animations se jouer
        }

        // Si aucun attribut "data-section", effectuer un scroll global
        for (let i = 0; i < document.body.scrollHeight; i += 800) {
            window.scrollTo({top: i, behavior: "smooth"});
            await delay(2000); // Pause pour capturer les animations
        }
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
                    }
                }
            },
        },
    };
}