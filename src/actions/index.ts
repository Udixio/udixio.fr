import {auth} from "@/lib/auth";
import prisma from "@/lib/prisma";
import {defineAction} from 'astro:actions';
import {z} from 'astro:schema';

export const server = {
    checkAuth: defineAction({
        // Aucun input requis, mais on accepte un objet vide
        input: z.object({}).optional(),
        handler: async (_input, {cookies, request}) => {
            const isAuthed = await auth.api
                .getSession({
                    headers: request.headers,
                })
            return {authenticated: Boolean(isAuthed)};
        },
    }),

    // ===== Organizations =====
    listOrganizations: defineAction({
        input: z.object({
            q: z.string().optional(),
            lifecycle: z.string().optional(),
            limit: z.number().int().min(1).max(100).default(25),
            offset: z.number().int().min(0).default(0),
        }).optional(),
        handler: async (input) => {
            const where: any = {};
            if (input?.q) where.name = {contains: input.q, mode: "insensitive"};
            if (input?.lifecycle) where.lifecycle = input.lifecycle as any;
            const [items, total] = await Promise.all([
                prisma.organization.findMany({
                    where,
                    orderBy: {createdAt: "desc"},
                    take: input?.limit ?? 25,
                    skip: input?.offset ?? 0,
                }),
                prisma.organization.count({where}),
            ]);
            return {items, total};
        }
    }),
    createOrganization: defineAction({
        input: z.object({
            name: z.string().min(2),
            slug: z.string().min(2),
            lifecycle: z.enum(["POTENTIAL","QUALIFIED","ACTIVE","PAUSED","NOT_POSSIBLE","LOST","CLOSED","ARCHIVED"]).optional(),
            notes: z.string().optional(),
            website: z.string().optional(),
        }),
        handler: async (input) => {
            const created = await prisma.organization.create({
                data: {
                    name: input.name,
                    slug: input.slug,
                    lifecycle: (input.lifecycle as any) ?? undefined,
                    notes: input.notes,
                    website: input.website,
                }
            });
            return {created};
        }
    }),
    importOrganizationsCsv: defineAction({
        input: z.object({
            csv: z.string().min(1), // header: name,slug[,lifecycle,website,notes]
        }),
        handler: async (input) => {
            const lines = input.csv.split(/\r?\n/).filter(l => l.trim().length > 0);
            if (lines.length === 0) return {created: 0};
            const [header, ...rows] = lines;
            const cols = header.split(",").map(c=>c.trim().toLowerCase());
            const idx = (k: string) => cols.indexOf(k.toLowerCase());
            const nIdx = idx("name");
            const sIdx = idx("slug");
            let count = 0;
            for (const row of rows) {
                const v = row.split(",");
                const name = v[nIdx]?.trim();
                const slug = v[sIdx]?.trim();
                if (!name || !slug) continue;
                const lifecycle = idx("lifecycle") >= 0 ? v[idx("lifecycle")]?.trim() as any : undefined;
                const website = idx("website") >= 0 ? v[idx("website")]?.trim() || undefined : undefined;
                const notes = idx("notes") >= 0 ? v[idx("notes")]?.trim() || undefined : undefined;
                await prisma.organization.create({data: {name, slug, lifecycle, website, notes}});
                count++;
            }
            return {created: count};
        }
    }),

    // ===== Contacts =====
    listContacts: defineAction({
        input: z.object({
            q: z.string().optional(),
            kind: z.string().optional(),
            limit: z.number().int().min(1).max(100).default(25),
            offset: z.number().int().min(0).default(0),
        }).optional(),
        handler: async (input) => {
            const where: any = {};
            if (input?.q) {
                where.OR = [
                    {firstName: {contains: input.q, mode: "insensitive"}},
                    {lastName: {contains: input.q, mode: "insensitive"}},
                    {company: {contains: input.q, mode: "insensitive"}},
                ]
            }
            if (input?.kind) where.kind = input.kind as any;
            const [items, total] = await Promise.all([
                prisma.contact.findMany({
                    where,
                    orderBy: {createdAt: "desc"},
                    take: input?.limit ?? 25,
                    skip: input?.offset ?? 0,
                }),
                prisma.contact.count({where})
            ]);
            return {items, total};
        }
    }),
    createContact: defineAction({
        input: z.object({
            kind: z.enum(["PERSON","GENERIC"]).default("PERSON"),
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            company: z.string().optional(),
            jobTitle: z.string().optional(),
            channels: z.string().optional(), // expect JSON string
            notes: z.string().optional(),
        }),
        handler: async (input) => {
            const created = await prisma.contact.create({
                data: {
                    kind: input.kind as any,
                    firstName: input.firstName,
                    lastName: input.lastName,
                    company: input.company,
                    jobTitle: input.jobTitle,
                    channels: input.channels ? JSON.parse(input.channels) : undefined,
                    notes: input.notes,
                }
            });
            return {created};
        }
    }),
    importContactsCsv: defineAction({
        input: z.object({
            csv: z.string().min(1), // header: kind,firstName,lastName,company,jobTitle,channels_json,notes
        }),
        handler: async (input) => {
            const lines = input.csv.split(/\r?\n/).filter(l => l.trim().length > 0);
            if (lines.length === 0) return {created: 0};
            const [header, ...rows] = lines;
            const cols = header.split(",").map(c=>c.trim().toLowerCase());
            const idx = (k: string) => cols.indexOf(k.toLowerCase());
            let count = 0;
            for (const row of rows) {
                const v = row.split(",");
                const kind = (idx("kind")>=0 ? v[idx("kind")]?.trim() : "PERSON") as any;
                const firstName = idx("firstname")>=0 ? v[idx("firstname")]?.trim() || undefined : undefined;
                const lastName = idx("lastname")>=0 ? v[idx("lastname")]?.trim() || undefined : undefined;
                const company = idx("company")>=0 ? v[idx("company")]?.trim() || undefined : undefined;
                const jobTitle = idx("jobtitle")>=0 ? v[idx("jobtitle")]?.trim() || undefined : undefined;
                const channelsStr = idx("channels_json")>=0 ? v[idx("channels_json")]?.trim() : undefined;
                const notes = idx("notes")>=0 ? v[idx("notes")]?.trim() || undefined : undefined;
                await prisma.contact.create({
                    data: {
                        kind,
                        firstName, lastName, company, jobTitle,
                        channels: channelsStr ? JSON.parse(channelsStr) : undefined,
                        notes,
                    }
                });
                count++;
            }
            return {created: count};
        }
    }),

    // ===== Clients =====
    listClients: defineAction({
        input: z.object({
            q: z.string().optional(),
            limit: z.number().int().min(1).max(100).default(25),
            offset: z.number().int().min(0).default(0),
        }).optional(),
        handler: async (input) => {
            const whereUser: any = {};
            if (input?.q) whereUser.OR = [
                {name: {contains: input.q, mode: "insensitive"}},
                {email: {contains: input.q, mode: "insensitive"}},
            ];
            const [items, total] = await Promise.all([
                prisma.client.findMany({
                    orderBy: {createdAt: 'desc'},
                    include: { user: { select: { id: true, name: true, email: true } } },
                    take: input?.limit ?? 25,
                    skip: input?.offset ?? 0,
                    where: { user: whereUser }
                }),
                prisma.client.count({ where: { user: whereUser } })
            ]);
            return {items, total};
        }
    }),
    createClient: defineAction({
        input: z.object({
            userId: z.string(),
            commercialNotes: z.string().optional(),
        }),
        handler: async (input) => {
            const created = await prisma.client.create({
                data: {
                    userId: input.userId,
                    commercialNotes: input.commercialNotes,
                }
            });
            return {created};
        }
    }),
    importClientsCsv: defineAction({
        input: z.object({
            csv: z.string().min(1), // header: userId[,commercialNotes]
        }),
        handler: async (input) => {
            const lines = input.csv.split(/\r?\n/).filter(l => l.trim().length > 0);
            if (lines.length === 0) return {created: 0};
            const [header, ...rows] = lines;
            const cols = header.split(",").map(c=>c.trim().toLowerCase());
            const idx = (k: string) => cols.indexOf(k.toLowerCase());
            const uIdx = idx("userid");
            let count = 0;
            for (const row of rows) {
                const v = row.split(",");
                const userId = v[uIdx]?.trim();
                if (!userId) continue;
                const commercialNotes = idx("commercialnotes")>=0 ? v[idx("commercialnotes")]?.trim() || undefined : undefined;
                await prisma.client.create({ data: { userId, commercialNotes } });
                count++;
            }
            return {created: count};
        }
    }),

    // ===== Projects =====
    listProjects: defineAction({
        input: z.object({
            q: z.string().optional(),
            organizationId: z.string().optional(),
            limit: z.number().int().min(1).max(100).default(25),
            offset: z.number().int().min(0).default(0),
        }).optional(),
        handler: async (input) => {
            const where: any = {};
            if (input?.organizationId) where.organizationId = input.organizationId;
            if (input?.q) where.name = {contains: input.q, mode: "insensitive"};
            const [items, total] = await Promise.all([
                prisma.project.findMany({
                    where,
                    orderBy: {createdAt: "desc"},
                    include: {organization: {select: {id: true, name: true}}},
                    take: input?.limit ?? 25,
                    skip: input?.offset ?? 0,
                }),
                prisma.project.count({where}),
            ]);
            return {items, total};
        }
    }),
    createProject: defineAction({
        input: z.object({
            name: z.string().min(2),
            description: z.string().optional(),
            organizationId: z.string(),
        }),
        handler: async (input) => {
            const created = await prisma.project.create({
                data: {
                    name: input.name,
                    description: input.description,
                    organizationId: input.organizationId,
                }
            });
            return {created};
        }
    }),
    importProjectsCsv: defineAction({
        input: z.object({
            csv: z.string().min(1), // attendu: header name,description,organizationId
        }),
        handler: async (input) => {
            const lines = input.csv.split(/\r?\n/).filter(l => l.trim().length > 0);
            if (lines.length === 0) return {created: 0};
            const [header, ...rows] = lines;
            const cols = header.split(",").map((c) => c.trim().toLowerCase());
            const nameIdx = cols.indexOf("name");
            const descIdx = cols.indexOf("description");
            const orgIdx = cols.indexOf("organizationid");
            if (nameIdx === -1 || orgIdx === -1) {
                throw new Error("CSV invalide: colonnes requises name,organizationId");
            }
            let count = 0;
            for (const row of rows) {
                const values = row.split(",");
                const name = values[nameIdx]?.trim();
                const organizationId = values[orgIdx]?.trim();
                const description = descIdx >= 0 ? values[descIdx]?.trim() : undefined;
                if (!name || !organizationId) continue;
                await prisma.project.create({data: {name, description, organizationId}});
                count++;
            }
            return {created: count};
        }
    }),

    // ===== Deals =====
    listDeals: defineAction({
        input: z.object({
            organizationId: z.string().optional(),
            projectId: z.string().optional(),
            clientId: z.string().optional(),
            // Backward compat:
            userId: z.string().optional(),
            status: z.string().optional(),
            limit: z.number().int().min(1).max(100).default(25),
            offset: z.number().int().min(0).default(0),
        }).optional(),
        handler: async (input) => {
            const where: any = {};
            if (input?.organizationId) where.organizationId = input.organizationId;
            if (input?.projectId) where.projectId = input.projectId;
            if (input?.clientId) where.clientId = input.clientId;
            if (input?.userId) where.userId = input.userId; // deprecated path during migration
            if (input?.status) where.status = input.status as any;
            const [items, total] = await Promise.all([
                prisma.deal.findMany({
                    where,
                    orderBy: {createdAt: "desc"},
                    include: {
                        organization: {select: {id: true, name: true}},
                        project: {select: {id: true, name: true}},
                        user: {select: {id: true, name: true, email: true}},
                        client: {select: { id: true, user: { select: { id: true, name: true, email: true } } }},
                    },
                    take: input?.limit ?? 25,
                    skip: input?.offset ?? 0,
                }),
                prisma.deal.count({where}),
            ]);
            return {items, total};
        }
    }),
    createDeal: defineAction({
        input: z.object({
            title: z.string().min(2),
            organizationId: z.string(),
            projectId: z.string().optional(),
            // Prefer clientId; userId kept for transition
            clientId: z.string().optional(),
            userId: z.string().optional(),
            amount: z.number().optional(),
            probability: z.number().min(0).max(100).optional(),
            status: z.enum(["LEAD", "QUALIFIED", "PROPOSAL_SENT", "WON", "LOST", "ON_HOLD"]).default("LEAD"),
        }),
        handler: async (input) => {
            const created = await prisma.deal.create({
                data: {
                    title: input.title,
                    organizationId: input.organizationId,
                    projectId: input.projectId,
                    clientId: input.clientId,
                    userId: input.userId,
                    amount: input.amount as any,
                    probability: input.probability,
                    status: input.status as any,
                }
            });
            return {created};
        }
    }),
    importDealsCsv: defineAction({
        input: z.object({
            csv: z.string().min(1), // header: title,organizationId,projectId?,clientId?/userId?,amount?,probability?,status?
        }),
        handler: async (input) => {
            const lines = input.csv.split(/\r?\n/).filter(l => l.trim().length > 0);
            if (lines.length === 0) return {created: 0};
            const [header, ...rows] = lines;
            const cols = header.split(",").map((c) => c.trim().toLowerCase());
            const idx = (k: string) => cols.indexOf(k.toLowerCase());
            const tIdx = idx("title");
            const oIdx = idx("organizationid");
            if (tIdx === -1 || oIdx === -1) throw new Error("CSV invalide: colonnes requises title,organizationId");
            let count = 0;
            for (const row of rows) {
                const v = row.split(",");
                const title = v[tIdx]?.trim();
                const organizationId = v[oIdx]?.trim();
                if (!title || !organizationId) continue;
                const projectId = idx("projectid") >= 0 ? v[idx("projectid")]?.trim() || undefined : undefined;
                const clientId = idx("clientid") >= 0 ? v[idx("clientid")]?.trim() || undefined : undefined;
                const userId = idx("userid") >= 0 ? v[idx("userid")]?.trim() || undefined : undefined;
                const amountStr = idx("amount") >= 0 ? v[idx("amount")]?.trim() : undefined;
                const probabilityStr = idx("probability") >= 0 ? v[idx("probability")]?.trim() : undefined;
                const status = idx("status") >= 0 ? (v[idx("status")]?.trim() as any) : undefined;
                await prisma.deal.create({
                    data: {
                        title,
                        organizationId,
                        projectId,
                        clientId,
                        userId,
                        amount: amountStr ? Number(amountStr) as any : undefined,
                        probability: probabilityStr ? Number(probabilityStr) : undefined,
                        status,
                    }
                });
                count++;
            }
            return {created: count};
        }
    }),

    // ===== Audits (read-only minimal) =====
    listAudits: defineAction({
        input: z.object({
            projectId: z.string().optional(),
            status: z.string().optional(),
            type: z.string().optional(),
            limit: z.number().int().min(1).max(100).default(25),
            offset: z.number().int().min(0).default(0),
        }).optional(),
        handler: async (input) => {
            const where: any = {};
            if (input?.projectId) where.projectId = input.projectId;
            if (input?.status) where.status = input.status as any;
            if (input?.type) where.type = input.type as any;
            const [items, total] = await Promise.all([
                prisma.audit.findMany({
                    where,
                    orderBy: {createdAt: "desc"},
                    include: {project: {select: {id: true, name: true}}},
                    take: input?.limit ?? 25,
                    skip: input?.offset ?? 0,
                }),
                prisma.audit.count({where}),
            ]);
            return {items, total};
        }
    }),
};
