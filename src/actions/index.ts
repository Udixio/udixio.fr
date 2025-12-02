import {auth} from "@/lib/auth";
import prisma from "@/lib/prisma";
import {defineAction} from 'astro:actions';
import {z} from 'astro:schema';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {opportunities} from "@/actions/opportunities.ts";

// ===== Shared runtime models loader (used by multiple actions) =====
export async function loadRuntimeDefinitions(): Promise<Record<string, Record<string, any>>> {
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
        // Fallback to Prisma runtime
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

    return runtimeModels;
}

// Build a "smart include" structure for a given model, limited depth
function buildSmartInclude(modelName: string, defs: Record<string, any>, depth = 0, maxDepth = 2): Record<string, any> | undefined {
    const modelDef = (defs as any)[modelName];
    if (!modelDef) return undefined;
    if (depth >= maxDepth) return undefined;

    const modelNames = new Set(Object.keys(defs));
    const include: Record<string, any> = {};

    const entries = Object.entries(modelDef).filter(([k]) => k !== 'ui');
    for (const [fieldName, metaAny] of entries) {
        const meta = metaAny as any;
        const isRelation = !!meta?.relationName || (modelNames.has(String(meta?.type)) && !meta?.isList);
        if (!isRelation) continue;
        if (meta?.isList) continue; // only singular relations for preview

        const targetModel = String(meta?.type ?? '');
        const targetDef = (defs as any)[targetModel];
        if (!targetDef) continue;

        // Should we include this relation? If target has any preview field, or this field belongs to a mutex group
        const targetHasPreview = Object.entries(targetDef)
            .filter(([k]) => k !== 'ui')
            .some(([, f]) => (f as any)?.ui?.preview === true);
        const memberOfMutex = Boolean(meta?.ui?.mutexKey);
        if (!targetHasPreview && !memberOfMutex) continue;

        // Recurse one level deeper to prepare nested include
        const nested = buildSmartInclude(targetModel, defs, depth + 1, maxDepth);
        include[fieldName] = nested ? {include: nested} : true;
    }

    return Object.keys(include).length > 0 ? include : undefined;
}

function deepMergeInclude(a?: any, b?: any): any {
    if (!a) return b;
    if (!b) return a;
    const out: any = Array.isArray(a) ? [...a] : {...a};
    for (const [k, v] of Object.entries(b)) {
        if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object') {
            out[k] = deepMergeInclude(out[k], v);
        } else {
            out[k] = v;
        }
    }
    return out;
}

export const server = {
    opportunities,
    getModels: defineAction({
        input: z.object({
            // optional list of model names to include; if omitted, returns all
            models: z.array(z.string()).optional(),
        }).optional(),
        handler: async (input) => {
            const runtimeModels = await loadRuntimeDefinitions();

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
        accept: "json",
        input: z.object({
            model: z.enum(["User", "Organization", "Project", "Deal", "Contact", "Client"]),
            q: z.string().optional(),
            limit: z.number().int().min(1).max(100).default(25),
            offset: z.number().int().min(0).default(0),
            whereJson: z.string().optional(),
            orderByField: z.string().optional(),
            orderByDir: z.enum(['asc', 'desc']).optional(),
            includeJson: z.string().optional(),
            smartPreview: z.boolean().default(false),
        }),
        handler: async (input) => {
            try {
                const {model, q, limit, offset, whereJson, orderByField, orderByDir, includeJson, smartPreview} = input;
                const where: any = whereJson ? JSON.parse(whereJson) : {};


                console.log('where', where)

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
                const orderBy: any = orderByField ? {[orderByField]: (orderByDir ?? 'asc')} : {createdAt: 'desc'};
                let include: any = includeJson ? JSON.parse(includeJson) : undefined;
                if (smartPreview) {
                    const defs = await loadRuntimeDefinitions();
                    const smart = buildSmartInclude(model, defs);
                    include = deepMergeInclude(include, smart);
                }
                const clientAny = prisma as any;
                const [items, total] = await Promise.all([
                    clientAny[model.toLowerCase()].findMany({
                        where,
                        take: limit,
                        skip: offset,
                        orderBy,
                        include,
                    }),
                    clientAny[model.toLowerCase()].count({where})
                ]);
                return {items, total};
            } catch (e) {
                console.log(e)
            }
        }
    }),
    createEntity: defineAction({
        accept: "json",
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
    updateEntity: defineAction({
        accept: "json",
        input: z.object({
            model: z.enum(["User", "Organization", "Project", "Deal", "Contact", "Client"]),
            id: z.string(),
            dataJson: z.string(),
        }),
        handler: async (input) => {
            const {model, id, dataJson} = input;
            const data = JSON.parse(dataJson || '{}');
            // Never allow updating the primary key
            if (data && typeof data === 'object' && 'id' in data) {
                delete (data as any).id;
            }
            const clientAny = prisma as any;
            const updated = await clientAny[model.toLowerCase()].update({
                where: {id},
                data,
            });
            return {updated};
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

};
