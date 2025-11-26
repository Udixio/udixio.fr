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
            const jsonPath = path.join(process.cwd(), 'src', 'generated', 'prisma-models.json');
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
                } catch { /* no overrides */
                }
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
        accept: "json",
        input: z.object({
            model: z.enum(["User", "Organization", "Project", "Deal", "Contact", "Client"]),
            dataJson: z.string(),
        }),
        handler: async (input) => {
            console.log(input);
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
