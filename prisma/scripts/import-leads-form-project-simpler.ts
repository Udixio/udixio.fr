import {ContactChannel, DealStatus} from "@/generated/prisma/enums.ts";
import fs from 'fs';
import path from 'path';
// Charge automatiquement les variables d'environnement depuis .env
// (tsx n'injecte pas .env par défaut)
import 'dotenv/config';
import {PrismaClient} from "@/generated/prisma/client.ts";

// Utilise la DATABASE_URL de l'environnement si disponible
const prisma = new PrismaClient(
    process.env.DATABASE_URL
        ? ({datasources: {db: {url: process.env.DATABASE_URL}}} as any)
        : ({} as any)
);

// --- Helpers de Parsing ---

// Regex pour parser une ligne CSV en respectant les guillemets (ex: "1,200€", "Nom, Prénom")
function parseCSVLine(text: string): string[] {
    const re_value = /(?!\s*$)\s*(?:'([^']*)'|"([^"]*)"|([^,'"]*))\s*(?:,|$)/g;
    const a: string[] = [];
    text.replace(re_value, (m0, m1, m2, m3) => {
        if (m1 !== undefined) a.push(m1.replace(/\\'/g, "'"));
        else if (m2 !== undefined) a.push(m2.replace(/\\"/g, '"'));
        else if (m3 !== undefined) a.push(m3);
        return '';
    });
    if (/,\s*$/.test(text)) a.push('');
    return a;
}

function parseDate(dateStr: string): Date | undefined {
    if (!dateStr || dateStr === '-') return undefined;
    // Format attendu : DD-MM-YYYY ou DD-MM-YYYY HH:mm
    const parts = dateStr.split(' ')[0].split('-');
    if (parts.length !== 3) return undefined;
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
}

function parseAmount(amountStr: string): number | undefined {
    if (!amountStr || amountStr === '-') return undefined;
    // Nettoie "620,00€" -> 620.00
    const cleaned = amountStr.replace(/[^0-9,.-]/g, '').replace(',', '.');
    const val = parseFloat(cleaned);
    return isNaN(val) ? undefined : val;
}

function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
}

// Génère un email unique basé sur le nom (car vos CSV n'ont pas d'emails)
function generatePlaceholderEmail(name: string): string {
    const cleanName = slugify(name);
    return `${cleanName}@placeholder.import`;
}

// Mappe les statuts français vers l'Enum Prisma
function mapDealStatus(frenchStatus: string): DealStatus {
    const s = frenchStatus.toLowerCase().trim();
    if (s.includes('gagné') || s.includes('accepté')) return DealStatus.WON;
    if (s.includes('perdu')) return DealStatus.LOST;
    if (s.includes('envoyé') || s.includes('cdc')) return DealStatus.PROPOSAL_SENT;
    if (s.includes('qualifié')) return DealStatus.QUALIFIED;
    // Default fallback
    return DealStatus.LEAD;
}

// --- Helpers de persistance (idempotents) ---

async function ensureOrganization(prisma: PrismaClient, orgName: string) {
    const baseSlug = slugify(orgName);
    // 1) Essayer par slug déterministe
    let org = await prisma.organization.findUnique({where: {slug: baseSlug}});
    // 2) Sinon par nom exact (au cas où une 1ère import a créé un slug aléatoire)
    if (!org) {
        org = await prisma.organization.findFirst({where: {name: orgName}});
    }
    // 3) Créer si absent
    if (!org) {
        org = await prisma.organization.create({
            data: {
                name: orgName,
                slug: baseSlug,
                website: orgName.includes('.') ? orgName : undefined,
            },
        });
    }
    return org;
}

async function ensureUserWithClient(prisma: PrismaClient, name: string, email: string, opts?: { phone?: string, tags?: string }) {
    // Upsert utilisateur basique
    const user = await prisma.user.upsert({
        where: {email},
        update: {name},
        create: {name, email},
    });

    // S'assurer que le Client 1-1 existe
    let client = await prisma.client.findUnique({where: {userId: user.id}});
    if (!client) {
        client = await prisma.client.create({
            data: {
                userId: user.id,
                notes: opts?.tags ? `Importé via script. Tags: ${opts.tags}` : undefined,
            },
        });
    }

    // Optionnel: ajouter le téléphone si non présent
    if (opts?.phone && opts.phone !== '-') {
        const existingCP = await prisma.contactPoint.findFirst({
            where: {clientId: client.id, value: opts.phone},
        });
        if (!existingCP) {
            await prisma.contactPoint.create({
                data: {
                    clientId: client.id,
                    channel: ContactChannel.PHONE_MOBILE,
                    value: opts.phone,
                    isPrimary: true,
                },
            });
        }
    }

    return {user, client};
}

async function ensureMember(prisma: PrismaClient, organizationId: string, userId: string, role = 'member') {
    const existing = await prisma.member.findFirst({where: {organizationId, userId}});
    if (existing) return existing;
    // id et createdAt sont obligatoires dans le schéma
    const id = `${organizationId}_${userId}`;
    return prisma.member.create({
        data: {
            id,
            organizationId,
            userId,
            role,
            createdAt: new Date(),
        },
    });
}

async function upsertDealForLead(prisma: PrismaClient, params: {
    orgId?: string,
    clientId?: string,
    title: string,
    status: DealStatus,
    openedAt?: Date,
    metadata?: any,
}) {
    const {orgId, clientId, title, status, openedAt, metadata} = params;
    const existing = await prisma.deal.findFirst({
        where: {title, organizationId: orgId ?? undefined, clientId: clientId ?? undefined},
    });
    if (existing) {
        return prisma.deal.update({
            where: {id: existing.id},
            data: {status, openedAt, metadata},
        });
    }
    return prisma.deal.create({
        data: {title, status, organizationId: orgId, clientId, openedAt, metadata},
    });
}

async function upsertDealForProposal(prisma: PrismaClient, params: {
    clientId?: string,
    title: string,
    status: DealStatus,
    amount?: number,
    openedAt?: Date,
    notes?: string,
}) {
    const {clientId, title, status, amount, openedAt, notes} = params;
    const existing = await prisma.deal.findFirst({
        where: {title, clientId: clientId ?? undefined},
    });
    if (existing) {
        return prisma.deal.update({
            where: {id: existing.id},
            data: {status, amount, openedAt, notes},
        });
    }
    return prisma.deal.create({
        data: {title, status, clientId, amount, openedAt, notes},
    });
}

async function main() {
    console.log('🚀 Démarrage de l\'importation...');

    // --- 1. IMPORT DES LEADS (Organisations & Clients) ---
    const leadsPath = path.resolve(process.cwd(), 'prisma', 'csv', 'Leads  Project Simpler.csv');
    if (fs.existsSync(leadsPath)) {
        const content = fs.readFileSync(leadsPath, 'utf-8');
        const lines = content.split('\n').filter((l) => l.trim().length > 0);

        console.log(`📂 Traitement de ${lines.length} leads...`);

        // Skip header (index 0 and 1 based on your file structure having garbage at top)
        // On cherche la ligne qui commence par "Nom"
        let startIndex = 0;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('Nom,Contact')) {
                startIndex = i + 1;
                break;
            }
        }

        for (let i = startIndex; i < lines.length; i++) {
            const cols = parseCSVLine(lines[i]);
            // Mapping basé sur votre CSV Leads:
            // 0: Nom (Org), 1: Contact principal (User), 2: Téléphone, 3: Propriétaire, 4: Étiquettes, 5: Créé à, 6: Statut
            const [orgName, contactName, phone, owner, tags, createdAtStr, statusStr] = cols;

            if (!orgName) continue;

            // 1. Créer/Trouver l'Organisation (déterministe)
            const organization = await ensureOrganization(prisma, orgName);

            // 2. Créer le User & Client (Si un nom de contact est présent)
            let clientId: string | undefined;
            let userIdForMember: string | undefined;

            if (contactName) {
                const email = generatePlaceholderEmail(contactName);
                const {user, client} = await ensureUserWithClient(prisma, contactName, email, {phone, tags});
                clientId = client?.id;
                userIdForMember = user.id;
                // Lier le contact (user) à l'organisation via Member si manquant
                if (userIdForMember) {
                    await ensureMember(prisma, organization.id, userIdForMember, 'member');
                }
            }

            // 3. Créer le Deal (Lead)
            if (statusStr) {
                await upsertDealForLead(prisma, {
                    title: `Lead: ${orgName}`,
                    status: mapDealStatus(statusStr),
                    orgId: organization.id,
                    clientId: clientId,
                    openedAt: parseDate(createdAtStr) || new Date(),
                    metadata: {originalOwner: owner, tags},
                });
            }
        }
    } else {
        console.warn(`⚠️ Fichier Leads introuvable à l'emplacement: ${leadsPath}`);
    }

    // --- 2. IMPORT DES PROPOSITIONS ---
    const propsPath = path.resolve(process.cwd(), 'prisma', 'csv', 'Les propositions  Project Simpler.csv');
    if (fs.existsSync(propsPath)) {
        const content = fs.readFileSync(propsPath, 'utf-8');
        const lines = content.split('\n').filter((l) => l.trim().length > 0);

        console.log(`📂 Traitement de ${lines.length} propositions...`);

        let startIndex = 0;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('Proposition,Client')) {
                startIndex = i + 1;
                break;
            }
        }

        for (let i = startIndex; i < lines.length; i++) {
            const cols = parseCSVLine(lines[i]);
            // 0: Prop, 1: Client, 2: Date, 3: Valable, 4: Email vu, 5: Aperçu vu, 6: Montant, 7: Statut
            const [propRef, clientName, dateStr, validUntil, emailSeen, previewSeen, amountStr, statusStr] = cols;

            if (!propRef || propRef === 'Total') continue;

            // On essaie de lier à un User existant (créé par l'import Leads), sinon on crée un nouveau
            let clientId: string | undefined;
            let organizationId: string | undefined;

            if (clientName) {
                // Stratégie : On cherche si c'est une Org ou un User
                // Ici on simplifie : on cherche un User par email généré
                const email = generatePlaceholderEmail(clientName);
                const existingUser = await prisma.user.findUnique({
                    where: {email},
                    include: {client: true}
                });

                if (existingUser && existingUser.client) {
                    clientId = existingUser.client.id;
                } else {
                    // Création à la volée si n'existait pas dans les leads
                    const newUser = await prisma.user.create({
                        data: {
                            name: clientName,
                            email: email,
                            client: {create: {notes: "Créé via import Propositions"}}
                        },
                        include: {client: true}
                    });
                    clientId = newUser.client?.id;
                }
            }

            // Création/Mise à jour du Deal (idempotent)
            await upsertDealForProposal(prisma, {
                title: propRef, // ex: "PROPOSITION #136"
                status: mapDealStatus(statusStr),
                clientId: clientId,
                amount: parseAmount(amountStr),
                openedAt: parseDate(dateStr),
                notes: `Valable jusqu'au: ${validUntil}. Vu le: ${emailSeen}`,
            });
        }
    } else {
        console.warn(`⚠️ Fichier Propositions introuvable à l'emplacement: ${propsPath}`);
    }

    console.log('✅ Importation terminée avec succès !');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });