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
                        user: {
                            include: {
                                // organisations liées via les memberships du user
                                members: {
                                    include: {
                                        organization: {
                                            include: {
                                                projects: {
                                                    include: {
                                                        websites: {
                                                            include: {
                                                                domains: true,
                                                            }
                                                        },
                                                    }
                                                },
                                                contactPoints: true,
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
                            },
                        },
                        contactPoints: true,
                    },
                },
                project: {
                    include: {
                        organization: {
                            include: {
                                projects: {
                                    include: {
                                        websites: {
                                            include: {
                                                domains: true,
                                            }
                                        },
                                    }
                                },
                                contactPoints: true,
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
                        projects: {
                            include: {
                                websites: {
                                    include: {
                                        domains: true,
                                    }
                                },
                            }
                        },
                        contactPoints: true,
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
                dealTagLinks: {
                    include: {
                        tag: true,
                    },
                }
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

            // Helpers de déduplication par id
            const uniqById = (arr: any[] = []) => {
                const seen = new Set<string>();
                const out: any[] = [];
                for (const x of arr) {
                    const id = x?.id;
                    if (!id || seen.has(id)) continue;
                    seen.add(id);
                    out.push(x);
                }
                return out;
            };

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

                // Rassembler toutes les organisations pertinentes
                const orgsFromDeal: any[] = [];
                if (deal.organization) orgsFromDeal.push(deal.organization);
                if (deal.project?.organization) orgsFromDeal.push(deal.project.organization);
                const orgsFromClientMembers: any[] = (deal.client?.user?.members || [])
                    .map((m: any) => m.organization)
                    .filter(Boolean);
                const organizations = uniqById([...orgsFromDeal, ...orgsFromClientMembers]);

                // Déterminer une organisation « principale » pour compat rétro
                let organization: any = null;
                if (target?.type === 'project') {
                    organization = deal.project?.organization ?? organizations[0] ?? null;
                } else if (target?.type === 'organization') {
                    organization = deal.organization ?? organizations[0] ?? null;
                } else if (target?.type === 'client') {
                    organization = organizations[0] ?? null;
                }

                // Clients associés
                const explicitClient = deal.client ? [deal.client] : [];
                const orgMembersClients = organizations.flatMap((org: any) =>
                    (org?.members || [])
                        .map((m: any) => m?.user?.client)
                        .filter(Boolean)
                );
                const clients = uniqById([...explicitClient, ...orgMembersClients]);

                // Projets associés
                const explicitProject = deal.project ? [deal.project] : [];
                let projects: any[] = [];
                if (explicitProject.length > 0) {
                    projects = explicitProject;
                } else {
                    const orgProjects = organizations.flatMap((org: any) => org?.projects || []);
                    projects = orgProjects;
                }
                projects = uniqById(projects);

                // Si une organisation est trouvée, on expose aussi ses membres + chaines user -> client -> contactPoints
                const organizationMembers = organization?.members ?? [];

                return {
                    deal,
                    target,
                    // compat champs existants
                    organization,
                    organizationMembers,
                    // nouveaux ensembles unifiés
                    organizations,
                    projects,
                    clients,
                };
            });

            return {items, total};
        },
    }),
};