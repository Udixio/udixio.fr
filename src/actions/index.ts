import {auth} from "@/lib/auth";
import prisma from "@/lib/prisma";
import {defineAction} from 'astro:actions';
import {z} from 'astro:schema';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

export const server = {
    getModels: defineAction({
        input: z.object({
            // optional list of model names to include; if omitted, returns all
            models: z.array(z.string()).optional(),
        }).optional(),
        handler: async (input) => {
            // Load pre-generated JSON exported by the Astro integration at startup/build
            // Fallback to prisma._runtimeDataModel if JSON missing (dev safety)
            // Read from PRIVATE generated metadata (not publicly served)
            const jsonPath = path.join(process.cwd(), 'src', '__generated__', 'prisma-models.json');
            let runtimeModels: Record<string, Record<string, any>> = {};
            try {
                const buf = await readFile(jsonPath, 'utf8');
                runtimeModels = JSON.parse(buf);
                // Optional overrides file to allow UI hints without touching generated JSON
                try {
                    const overridesPath = path.join(process.cwd(), 'src', 'models-overrides.json');
                    const oBuf = await readFile(overridesPath, 'utf8');
                    const overrides = JSON.parse(oBuf) as Record<string, Record<string, any>>;
                    for (const [modelName, fields] of Object.entries(overrides || {})) {
                        if (!runtimeModels[modelName]) continue;
                        for (const [fieldName, meta] of Object.entries(fields || {})) {
                            runtimeModels[modelName][fieldName] = {
                                ...(runtimeModels[modelName][fieldName] || {}),
                                ...(meta as any),
                                ui: {
                                    ...((runtimeModels[modelName][fieldName] || {}).ui || {}),
                                    ...(((meta as any).ui) || {}),
                                }
                            };
                        }
                    }
                } catch { /* no overrides */ }
            } catch {
                runtimeModels = (prisma as any)?._runtimeDataModel?.models ?? {};
                // If coming from prisma runtime, transform into expected shape Record<model, Record<field, meta>>
                if (runtimeModels && !Array.isArray(runtimeModels) && typeof runtimeModels === 'object') {
                    const transformed: Record<string, Record<string, any>> = {};
                    for (const [modelName, modelDef] of Object.entries(runtimeModels as any)) {
                        const fields = (modelDef as any).fields as any[];
                        const rec: Record<string, any> = {};
                        for (const f of fields) {
                            rec[f.name] = {
                                isList: !!f.isList,
                                isRequired: !!f.isRequired,
                                isUnique: !!f.isUnique,
                                isId: !!f.isId,
                                isReadOnly: !!f.isReadOnly,
                                hasDefaultValue: !!f.hasDefaultValue,
                                type: String(f.type),
                                default: typeof f.default === 'function' ? undefined : f.default,
                                relationName: f.relationName ?? null,
                                relationFromFields: f.relationFromFields ?? null,
                                relationToFields: f.relationToFields ?? null,
                                documentation: f.documentation ?? null,
                                ui: {hidden: false, label: null, placeholder: null},
                            };
                        }
                        transformed[modelName] = rec;
                    }
                    runtimeModels = transformed;
                }
            }

            const requested = input?.models?.length ? new Set(input.models.map((m) => m.toString())) : null;
            // When specific models are requested, also include their dependent models recursively
            let effective: Set<string> | null = requested ? new Set<string>(requested) : null;
            if (requested) {
                const isModel = (name: string) => Object.prototype.hasOwnProperty.call(runtimeModels, name);
                const queue: string[] = Array.from(requested);
                const visited = new Set<string>();
                while (queue.length) {
                    const current = queue.shift()!;
                    if (visited.has(current)) continue;
                    visited.add(current);
                    const modelDef = (runtimeModels as any)[current];
                    if (!modelDef) continue;
                    const fieldsRecord: Record<string, any> = modelDef as any;
                    for (const [fieldName, f] of Object.entries(fieldsRecord)) {
                        void fieldName;
                        const t = String((f as any)?.type ?? '');
                        // If field type names another Prisma model, include it
                        if (t && isModel(t) && !effective!.has(t)) {
                            effective!.add(t);
                            queue.push(t);
                        }
                    }
                }
            }
            // If using JSON format already, just pick effective subset
            const output: Record<string, Record<string, any>> = {};
            for (const [modelName, fieldsRecord] of Object.entries(runtimeModels)) {
                if (effective && !effective.has(modelName)) continue;
                output[modelName] = fieldsRecord as any;
            }
            return output;
        }
    }),
    // ===== Generic entities (whitelisted) =====
    listEntities: defineAction({
        input: z.object({
            model: z.enum(["User", "Organization", "Project", "Deal", "Contact", "Client"]),
            q: z.string().optional(),
            limit: z.number().int().min(1).max(100).default(25),
            offset: z.number().int().min(0).default(0),
            whereJson: z.string().optional(),
        }),
        handler: async (input) => {
            const {model, q, limit, offset, whereJson} = input;
            const where: any = whereJson ? JSON.parse(whereJson) : {};
            // Basic search mapping per model
            if (q) {
                const contains = (field: string) => ({[field]: {contains: q, mode: 'insensitive'}});
                if (model === 'User') where.OR = [contains('name'), contains('email')];
                if (model === 'Organization') where.OR = [contains('name'), contains('slug')];
                if (model === 'Project') where.name = {contains: q, mode: 'insensitive'};
                if (model === 'Deal') where.title = {contains: q, mode: 'insensitive'};
                if (model === 'Contact') where.OR = [contains('firstName'), contains('lastName'), contains('company')];
                if (model === 'Client') where.user = {OR: [contains('name'), contains('email')]} as any;
            }
            const clientAny = prisma as any;
            const [items, total] = await Promise.all([
                clientAny[model.toLowerCase()].findMany({
                    where,
                    take: limit,
                    skip: offset,
                    orderBy: {createdAt: 'desc'}
                }),
                clientAny[model.toLowerCase()].count({where})
            ]);
            return {items, total};
        }
    }),
    createEntity: defineAction({
        input: z.object({
            model: z.enum(["User", "Organization", "Project", "Deal", "Contact", "Client"]),
            dataJson: z.string(),
        }),
        handler: async (input) => {
            const data = JSON.parse(input.dataJson);
            // Guard against writing read-only/id fields will be handled at Prisma level too
            const clientAny = prisma as any;
            const created = await clientAny[input.model.toLowerCase()].create({data});
            return {created};
        }
    }),

    // ===== Users (minimal) =====
    listUsers: defineAction({
        input: z.object({
            q: z.string().optional(),
            limit: z.number().int().min(1).max(100).default(25),
            offset: z.number().int().min(0).default(0),
        }).optional(),
        handler: async (input) => {
            const where: any = {};
            if (input?.q) {
                where.OR = [
                    {name: {contains: input.q, mode: "insensitive"}},
                    {email: {contains: input.q, mode: "insensitive"}},
                ]
            }
            const [items, total] = await Promise.all([
                prisma.user.findMany({
                    where,
                    orderBy: {createdAt: 'desc'},
                    select: {id: true, name: true, email: true},
                    take: input?.limit ?? 25,
                    skip: input?.offset ?? 0,
                }),
                prisma.user.count({where}),
            ]);
            return {items, total};
        }
    }),
    createUser: defineAction({
        input: z.object({
            name: z.string().min(2),
            email: z.string().email(),
        }),
        handler: async (input) => {
            const created = await prisma.user.create({
                data: {name: input.name, email: input.email}
            });
            return {created};
        }
    }),
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
            lifecycle: z.enum(["POTENTIAL", "QUALIFIED", "ACTIVE", "PAUSED", "NOT_POSSIBLE", "LOST", "CLOSED", "ARCHIVED"]).optional(),
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
            const cols = header.split(",").map(c => c.trim().toLowerCase());
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
            kind: z.enum(["PERSON", "GENERIC"]).default("PERSON"),
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
            const cols = header.split(",").map(c => c.trim().toLowerCase());
            const idx = (k: string) => cols.indexOf(k.toLowerCase());
            let count = 0;
            for (const row of rows) {
                const v = row.split(",");
                const kind = (idx("kind") >= 0 ? v[idx("kind")]?.trim() : "PERSON") as any;
                const firstName = idx("firstname") >= 0 ? v[idx("firstname")]?.trim() || undefined : undefined;
                const lastName = idx("lastname") >= 0 ? v[idx("lastname")]?.trim() || undefined : undefined;
                const company = idx("company") >= 0 ? v[idx("company")]?.trim() || undefined : undefined;
                const jobTitle = idx("jobtitle") >= 0 ? v[idx("jobtitle")]?.trim() || undefined : undefined;
                const channelsStr = idx("channels_json") >= 0 ? v[idx("channels_json")]?.trim() : undefined;
                const notes = idx("notes") >= 0 ? v[idx("notes")]?.trim() || undefined : undefined;
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
                    include: {user: {select: {id: true, name: true, email: true}}},
                    take: input?.limit ?? 25,
                    skip: input?.offset ?? 0,
                    where: {user: whereUser}
                }),
                prisma.client.count({where: {user: whereUser}})
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
            const cols = header.split(",").map(c => c.trim().toLowerCase());
            const idx = (k: string) => cols.indexOf(k.toLowerCase());
            const uIdx = idx("userid");
            let count = 0;
            for (const row of rows) {
                const v = row.split(",");
                const userId = v[uIdx]?.trim();
                if (!userId) continue;
                const commercialNotes = idx("commercialnotes") >= 0 ? v[idx("commercialnotes")]?.trim() || undefined : undefined;
                await prisma.client.create({data: {userId, commercialNotes}});
                count++;
            }
            return {created: count};
        }
    }),

    // ===== Client wizard (composite creation) =====
    createClientWizard: defineAction({
        input: z.object({
            // Client info
            commercialNotes: z.string().optional(),
            clientDataJson: z.string().optional(), // additional scalar fields for Client

            // User: either existing by id or create minimal
            user: z.discriminatedUnion('mode', [
                z.object({mode: z.literal('existing'), userId: z.string()}),
                z.object({mode: z.literal('create'), name: z.string().min(2), email: z.string().email()}),
            ]),

            // Organization: none | existing | create
            organization: z.union([
                z.object({mode: z.literal('none')}),
                z.object({mode: z.literal('existing'), organizationId: z.string()}),
                z.object({mode: z.literal('create'), name: z.string().min(2), slug: z.string().min(2)}),
            ]).default({mode: 'none' as const}),

            // Optional initial project (single for v1)
            project: z.union([
                z.object({mode: z.literal('none')}),
                z.object({mode: z.literal('existing'), projectId: z.string()}),
                z.object({
                    mode: z.literal('create'),
                    name: z.string().min(2),
                    description: z.string().optional(),
                    organizationId: z.string().optional()
                }),
            ]).default({mode: 'none' as const}),
        }),
        handler: async (input) => {
            // Resolve/create user
            let userId: string;
            if (input.user.mode === 'existing') {
                userId = input.user.userId;
            } else {
                const u = await prisma.user.create({data: {name: input.user.name, email: input.user.email}});
                userId = u.id;
            }

            // Create client
            const clientData = input.clientDataJson ? JSON.parse(input.clientDataJson) : {};
            const client = await prisma.client.create({
                data: {
                    ...clientData,
                    userId,
                    commercialNotes: input.commercialNotes ?? clientData.commercialNotes,
                },
                include: {user: {select: {id: true, name: true, email: true}}}
            });

            // Resolve/create organization and link via Member (User <-> Organization)
            let organizationId: string | undefined = undefined;
            if (input.organization.mode === 'existing') {
                organizationId = input.organization.organizationId;
            } else if (input.organization.mode === 'create') {
                const org = await prisma.organization.create({
                    data: {
                        name: input.organization.name,
                        slug: input.organization.slug,
                    }
                });
                organizationId = org.id;
            }
            if (organizationId) {
                // create Member link between user and organization if not exists
                const exists = await prisma.member.findFirst({where: {userId, organizationId}});
                if (!exists) {
                    await prisma.member.create({
                        data: {
                            id: `${userId}_${organizationId}`,
                            userId,
                            organizationId,
                            role: 'MEMBER',
                            createdAt: new Date()
                        }
                    });
                }
            }

            // Optional project processing
            let projectId: string | undefined = undefined;
            if (input.project.mode === 'existing') {
                projectId = input.project.projectId;
                // attach client to existing project
                await prisma.project.update({where: {id: projectId}, data: {clientId: client.id}});
            } else if (input.project.mode === 'create') {
                const orgForProject = input.project.organizationId ?? organizationId;
                if (!orgForProject) {
                    // No organization available -> skip creation and return warning
                } else {
                    const proj = await prisma.project.create({
                        data: {
                            name: input.project.name,
                            description: input.project.description,
                            organizationId: orgForProject,
                            clientId: client.id,
                        }
                    });
                    projectId = proj.id;
                }
            }

            return {created: {client, organizationId, projectId}};
        }
    }),

    // Same as createClientWizard but accepts a JSON payload to simplify client form posting
    createClientWizardJson: defineAction({
        input: z.object({payload: z.string()}),
        handler: async (input) => {
            const parsed = JSON.parse(input.payload);
            // Re-use the same logic by calling through Prisma directly
            // Validate minimal shape
            const safe = z.object({
                commercialNotes: z.string().optional(),
                clientDataJson: z.string().optional(),
                user: z.object({mode: z.string()}).passthrough(),
                organization: z.object({mode: z.string()}).passthrough().optional(),
                project: z.object({mode: z.string()}).passthrough().optional(),
            }).parse(parsed);

            // Map to createClientWizard input and delegate by reusing the code above
            // Resolve/create user
            let userId: string;
            if (safe.user.mode === 'existing') {
                userId = (safe.user as any).userId as string;
            } else {
                const u = await prisma.user.create({
                    data: {
                        name: (safe.user as any).name,
                        email: (safe.user as any).email
                    }
                });
                userId = u.id;
            }

            const clientData = safe.clientDataJson ? JSON.parse(safe.clientDataJson) : {};
            const client = await prisma.client.create({
                data: {userId, ...clientData, commercialNotes: safe.commercialNotes ?? clientData.commercialNotes},
                include: {user: {select: {id: true, name: true, email: true}}}
            });

            // Organization handling (link through Member)
            let organizationId: string | undefined;
            const org = safe.organization;
            if (org?.mode === 'existing') {
                organizationId = (org as any).organizationId as string;
            } else if (org?.mode === 'create') {
                const created = await prisma.organization.create({
                    data: {
                        name: (org as any).name,
                        slug: (org as any).slug
                    }
                });
                organizationId = created.id;
            }
            if (organizationId) {
                const exists = await prisma.member.findFirst({where: {userId: client.userId, organizationId}});
                if (!exists) {
                    await prisma.member.create({
                        data: {
                            id: `${client.userId}_${organizationId}`,
                            userId: client.userId,
                            organizationId,
                            role: 'MEMBER',
                            createdAt: new Date()
                        }
                    });
                }
            }

            // Project handling
            let projectId: string | undefined;
            const proj = safe.project;
            if (proj?.mode === 'existing') {
                projectId = (proj as any).projectId as string;
                await prisma.project.update({where: {id: projectId}, data: {clientId: client.id}});
            } else if (proj?.mode === 'create') {
                const orgForProject = (proj as any).organizationId ?? organizationId;
                if (orgForProject) {
                    const created = await prisma.project.create({
                        data: {
                            name: (proj as any).name,
                            description: (proj as any).description,
                            organizationId: orgForProject,
                            clientId: client.id
                        }
                    });
                    projectId = created.id;
                }
            }

            return {created: {client, organizationId, projectId}};
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
                        client: {select: {id: true, user: {select: {id: true, name: true, email: true}}}},
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
