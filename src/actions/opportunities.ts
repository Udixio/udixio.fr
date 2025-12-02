import {defineAction} from 'astro:actions';
import {z} from 'astro:schema';
import prisma from '@/lib/prisma';

// Action group dedicated to Opportunities (Deals)
// Fournit une liste paginée avec enrichissement des cibles et du contexte orga
export const opportunities = {
    list: defineAction({
        accept: 'json',
        input: z.object({
            q: z.string().optional(),
            limit: z.number().int().min(1).max(100).default(25),
            offset: z.number().int().min(0).default(0),
            whereJson: z.string().optional(), // filtres avancés (future‑proof)
            orderByField: z.string().optional(),
            orderByDir: z.enum(['asc', 'desc']).optional(),
        }),
        handler: async (input) => {
            const {q, limit, offset, whereJson, orderByField, orderByDir} = input;

            // Construire le where de Prisma à partir de whereJson + recherche simple
            const where: any = whereJson ? JSON.parse(whereJson) : {};
            if (q && q.trim().length > 0) {
                // Recherche basique sur le titre du deal
                where.title = {contains: q.trim(), mode: 'insensitive'};
            }

            const orderBy: any = orderByField
                ? {[orderByField]: (orderByDir ?? 'asc')}
                : {createdAt: 'desc'};

            // Inclure tout ce qui est nécessaire pour composer la réponse finale sans N+1
            const include = {
                client: {
                    include: {
                        user: true,
                        contactPoints: true,
                    },
                },
                project: {
                    include: {
                        organization: {
                            include: {
                                members: {
                                    include: {
                                        user: {
                                            include: {
                                                client: {
                                                    include: {contactPoints: true},
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                organization: {
                    include: {
                        members: {
                            include: {
                                user: {
                                    include: {
                                        client: {
                                            include: {contactPoints: true},
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            } as const;

            const [rows, total] = await Promise.all([
                prisma.deal.findMany({
                    where,
                    take: limit,
                    skip: offset,
                    orderBy,
                    include: include as any,
                }),
                prisma.deal.count({where}),
            ]);

            // Composer la ligne unifiée par opportunité
            const items = rows.map((deal: any) => {
                // Déterminer la cible (priorité: client -> project -> organization)
                let target: any = null;
                if (deal.client) {
                    target = {type: 'client', client: deal.client};
                } else if (deal.project) {
                    target = {type: 'project', project: deal.project};
                } else if (deal.organization) {
                    target = {type: 'organization', organization: deal.organization};
                }

                // Si target = project, remonter l'organisation liée au projet
                let organization = null as any;
                if (target?.type === 'project') {
                    organization = deal.project?.organization ?? null;
                } else if (target?.type === 'organization') {
                    organization = deal.organization ?? null;
                }

                // Si une organisation est trouvée, on expose aussi ses membres + chaines user -> client -> contactPoints
                const organizationMembers = organization?.members ?? [];

                return {
                    deal,
                    target,
                    organization,
                    organizationMembers,
                };
            });

            return {items, total};
        },
    }),
};