import {defineAction} from 'astro:actions';
import {z} from "astro:schema";
import prisma from "@/lib/prisma.ts";

export const model = {
    getModels: defineAction({
        input: z.object({
            // optional list of model names to include; if omitted, returns all
            models: z.array(z.string()).optional(),
        }).optional(),
        handler: async (input) => {
            // Prisma exposes a runtime data model on the client instance.
            // We only extract serializable information for fields to help build dynamic forms.
            const runtimeModels = (prisma as any)?._runtimeDataModel?.models ?? {};
            const requested = input?.models?.length ? new Set(input.models.map((m) => m.toString())) : null;
            console.log("Effective models:");
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
                    const fields: any[] = (modelDef as any).fields ?? [];
                    for (const f of fields) {
                        const t = String(f?.type ?? '');
                        // If field type names another Prisma model, include it
                        if (t && isModel(t) && !effective!.has(t)) {
                            effective!.add(t);
                            queue.push(t);
                        }
                    }
                }
            }
            console.log("Effective models:");
            const result: Record<string, Array<{
                name: string;
                isList: boolean;
                isRequired: boolean;
                isUnique: boolean;
                isId: boolean;
                isReadOnly: boolean;
                hasDefaultValue: boolean;
                type: string;
                default?: any;
                relationName?: string | null;
                relationFromFields?: string[] | null;
                relationToFields?: string[] | null;
                documentation?: string | null;
            }>> = {};

            console.log("Effective models:", effective);

            for (const [modelName, modelDef] of Object.entries(runtimeModels)) {
                if (effective && !effective.has(modelName)) continue;
                const fields = (modelDef as any).fields as any[];
                result[modelName] = fields.map((f) => ({
                    name: f.name,
                    isList: Boolean(f.isList),
                    isRequired: Boolean(f.isRequired),
                    isUnique: Boolean(f.isUnique),
                    isId: Boolean(f.isId),
                    isReadOnly: Boolean(f.isReadOnly),
                    hasDefaultValue: Boolean(f.hasDefaultValue),
                    type: String(f.type),
                    default: typeof f.default === 'function' ? undefined : f.default,
                    relationName: (f.relationName ?? null) as any,
                    relationFromFields: (f.relationFromFields ?? null) as any,
                    relationToFields: (f.relationToFields ?? null) as any,
                    documentation: (f.documentation ?? null) as any,
                }));
            }


            console.log("Models:", result);
            return result;
        }
    }),
}