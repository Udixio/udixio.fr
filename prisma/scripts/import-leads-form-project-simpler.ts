import {ContactChannel, DealStatus} from "@/generated/prisma/enums.ts";
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import {PrismaClient} from "@/generated/prisma/client.ts";

const prisma = new PrismaClient(
    process.env.DATABASE_URL
        ? ({datasources: {db: {url: process.env.DATABASE_URL}}} as any)
        : ({} as any)
);

// --- Helpers ---

// Regex pour parser le CSV correctement (gère les virgules dans les guillemets)
function parseCSVLine(text: string): string[] {
    const re_value = /(?!\s*$)\s*(?:'([^']*)'|"([^"]*)"|([^,'"]*))\s*(?:,|$)/g;
    const a: string[] = [];
    text.replace(re_value, (m0, m1, m2, m3) => {
        if (m1 !== undefined) a.push(m1.replace(/\\'/g, "'"));
        else if (m2 !== undefined) a.push(m2.replace(/\\"/g, '"'));
        else if (m3 !== undefined) a.push(m3);
        return '';
    });
    // Remove empty element added at the end by the regex often
    if (a.length > 0 && a[a.length - 1] === '' && !text.endsWith(',')) {
        a.pop();
    }
    return a;
}

function slugify(text: string): string {
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
}

// Nettoie les valeurs nulles ou "NULL" du CSV
function clean(val: string | undefined): string | undefined {
    if (!val) return undefined;
    const trimmed = val.trim();
    if (trimmed === '' || trimmed === 'NULL') return undefined;
    return trimmed;
}

function mapDealStatus(csvStatus: string): DealStatus {
    const s = csvStatus?.toLowerCase().trim() || '';
    if (s.includes('gagné')) return DealStatus.WON;
    if (s.includes('perdu')) return DealStatus.LOST;
    if (s.includes('envoyé') || s.includes('cdc')) return DealStatus.PROPOSAL_SENT;
    if (s.includes('qualifié')) return DealStatus.QUALIFIED;
    if (s.includes('nouveau') || s.includes('discussion') || s.includes('rappeler')) return DealStatus.LEAD;
    return DealStatus.LEAD;
}

// Génère une couleur hex aléatoire pour les tags
function getRandomColor() {
    const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// --- Main Import Logic ---

// Crée une note liée à un deal si une note identique (même contenu) n'existe pas déjà
async function ensureNoteForDeal(params: { dealId: string, content: string, authorId?: string }) {
    const {dealId, content, authorId} = params;
    if (!content) return;
    const exists = await prisma.note.findFirst({ where: { dealId, content } });
    if (exists) return exists;
    return prisma.note.create({
        data: {
            dealId,
            content,
            authorId: authorId,
        }
    });
}

async function main() {
    console.log('🚀 Démarrage de l\'importation Rise...');

    // Nouveau chemin du CSV selon l'arborescence actuelle
    const csvPath = path.resolve(process.cwd(), 'prisma', 'csv', 'rise_clients.csv');

    if (!fs.existsSync(csvPath)) {
        console.error(`❌ Fichier introuvable : ${csvPath}`);
        process.exit(1);
    }

    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n').filter((l) => l.trim().length > 0);

    console.log(`📂 Traitement de ${lines.length - 1} lignes...`);

    // Skip header (start at 1)
    for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);

        // Mapping des colonnes CSV
        const [
            id, type, lead_status_name, lead_labels, company_name, company_adress,
            company_city, company_country, company_zip, company_vat_number,
            company_phone, project_url, user_first_name, user_last_name,
            user_email, user_job_title, user_gender, user_phone
        ] = cols.map(clean);

        // --- 1. Gestion des Tags ---
        // On prépare la liste des IDs de tags pour les connecter plus tard
        const tagConnect: { id: string }[] = [];

        if (lead_labels) {
            const labelList = lead_labels.split(',').map(s => s.trim()).filter(s => s);
            for (const label of labelList) {
                // Upsert Tag
                let tag = await prisma.tag.findUnique({where: {name: label}});
                if (!tag) {
                    tag = await prisma.tag.create({
                        data: {name: label, color: getRandomColor()}
                    });
                }
                tagConnect.push({id: tag.id});
            }
        }

        // --- 2. Gestion de l'Organisation ---
        let organizationId: string | undefined;

        if (company_name) {
            const orgSlug = slugify(company_name);

            // Upsert Organization
            // On cherche d'abord par slug pour éviter doublon
            let org = await prisma.organization.findUnique({where: {slug: orgSlug}});

            if (!org) {
                org = await prisma.organization.create({
                    data: {
                        name: company_name,
                        slug: orgSlug,
                        website: project_url,
                        address: company_adress,
                        city: company_city,
                        zip: company_zip,
                        country: company_country,
                        vatNumber: company_vat_number,
                        // On associe les tags aussi à l'organisation pour info
                        tags: {connect: tagConnect}
                    }
                });
            } else {
                // Update si infos manquantes (optionnel, ici on update l'adresse si vide)
                await prisma.organization.update({
                    where: {id: org.id},
                    data: {
                        website: project_url ?? org.website,
                        address: company_adress,
                        city: company_city,
                        zip: company_zip,
                        country: company_country,
                        vatNumber: company_vat_number,
                        // Maintenir les tags à jour (idempotent via set)
                        ...(tagConnect.length > 0 ? {tags: {set: tagConnect}} : {})
                    }
                });
            }
            organizationId = org.id;

            // Ajout du téléphone pro de l'entreprise (ContactPoint)
            if (company_phone) {
                const existingPhone = await prisma.contactPoint.findFirst({
                    where: {organizationId: org.id, value: company_phone}
                });
                if (!existingPhone) {
                    await prisma.contactPoint.create({
                        data: {
                            organizationId: org.id,
                            channel: ContactChannel.PHONE_LANDLINE, // On assume fixe pour une boîte
                            value: company_phone,
                            label: "Standard"
                        }
                    });
                }
            }
        }

        // --- 3. Gestion du User et Client ---
        let clientId: string | undefined;
        let userId: string | undefined;

        // On a besoin au moins d'un nom ou prénom pour créer un user
        if (user_first_name || user_last_name) {
            const email = user_email || 'unknown';
            const isVerified = !!email && email.toLowerCase() !== 'unknown' && email.toLowerCase() !== 'unknkow';

            // Upsert User
            // Upsert User (create or update)
            const fullName = `${user_first_name || ''} ${user_last_name || ''}`.trim() || email;
            const user = await prisma.user.upsert({
                where: {email},
                update: {
                    name: fullName,
                    firstName: user_first_name ?? undefined,
                    lastName: user_last_name ?? undefined,
                    emailVerified: isVerified,
                },
                create: {
                    email: email,
                    name: fullName,
                    firstName: user_first_name ?? undefined,
                    lastName: user_last_name ?? undefined,
                    emailVerified: isVerified,
                }
            });
            userId = user.id;

            // Upsert Client
            let client = await prisma.client.findUnique({where: {userId: user.id}});
            if (!client) {
                client = await prisma.client.create({
                    data: {
                        userId: user.id,
                        jobTitle: user_job_title,
                        gender: user_gender,
                    }
                });
            } else {
                // Mettre à jour les infos CRM si fournies
                await prisma.client.update({
                    where: {id: client.id},
                    data: {
                        jobTitle: user_job_title ?? client.jobTitle,
                        gender: user_gender ?? client.gender,
                    }
                });
                // re-fetch not strictly needed
            }
            clientId = client.id;

            // Ajout du téléphone perso/mobile du client (ContactPoint)
            if (user_phone) {
                const existingMobile = await prisma.contactPoint.findFirst({
                    where: {clientId: client.id, value: user_phone}
                });
                if (!existingMobile) {
                    await prisma.contactPoint.create({
                        data: {
                            clientId: client.id,
                            channel: ContactChannel.PHONE_MOBILE,
                            value: user_phone,
                            isPrimary: true
                        }
                    });
                }
            }

            // --- 4. Lier User à l'Organisation (Member) ---
            if (organizationId) {
                const memberId = `${organizationId}_${user.id}`;
                const isMember = await prisma.member.findUnique({where: {id: memberId}});
                if (!isMember) {
                    await prisma.member.create({
                        data: {
                            id: memberId,
                            organizationId: organizationId,
                            userId: user.id,
                            role: 'ADMIN', // On assume admin par défaut pour le contact principal
                            createdAt: new Date()
                        }
                    });
                }
            }
        }

        // --- 5. Création du Deal ---
        // On crée un deal si on a un statut ou si c'est une ligne valide
        const dealTitle = company_name ? `Projet ${company_name}` : (user_last_name ? `Projet ${user_last_name}` : 'Nouveau Deal');

        // On évite de créer des doublons de deals identiques
        const existingDeal = await prisma.deal.findFirst({
            where: {
                organizationId: organizationId,
                clientId: clientId,
                title: dealTitle
            }
        });

        const status = mapDealStatus(lead_status_name || '');
        // Préparer le contenu de note d'import (historique)
        const importNote = lead_status_name
            ? `Statut initial détecté lors de l'import : ${lead_status_name}`
            : undefined;

        if (!existingDeal) {
            const created = await prisma.deal.create({
                data: {
                    title: dealTitle,
                    status,
                    organizationId: organizationId,
                    clientId: clientId,
                    tags: {connect: tagConnect}, // Lier les tags au deal
                }
            });
            // Créer une note d'import si applicable (idempotent)
            if (importNote) {
                await ensureNoteForDeal({dealId: created.id, content: importNote});
            }
        } else {
            // Mise à jour du deal existant (statut, tags)
            await prisma.deal.update({
                where: {id: existingDeal.id},
                data: {
                    status,
                    ...(tagConnect.length > 0 ? {tags: {set: tagConnect}} : {})
                }
            });
            // Ajouter une note d'import si applicable (idempotent)
            if (importNote) {
                await ensureNoteForDeal({dealId: existingDeal.id, content: importNote});
            }
        }

        process.stdout.write('.'); // Progress dot
    }

    console.log('\n✅ Importation terminée !');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });