// src/utils/modelUtils.ts

export type RelationInfo = {
    name: string;
    isList: boolean;
    isRequired: boolean;
    targetModel: string;
    fk?: string; // pour les relations singulières: nom du champ FK côté parent
    ui?: any;
};

/**
 * Retourne la liste des relations d'un modèle donné à partir de defs (src/generated/prisma-models.json chargées en mémoire)
 */
export function getModelRelations(defs: Record<string, any> | undefined, modelName: string): RelationInfo[] {
    if (!defs || !defs[modelName]) return [];
    const modelDef = defs[modelName] as Record<string, any>;
    const modelNames = new Set(Object.keys(defs));
    const out: RelationInfo[] = [];

    // 1. Relations natives Prisma
    for (const [fieldName, meta] of Object.entries(modelDef)) {
        if (fieldName === 'ui') continue;
        const m = meta as any;

        // Détection standard Prisma (relationName est la clé fiable)
        if (m.relationName) {
            const fk = !m.isList && Array.isArray(m.relationFromFields) && m.relationFromFields.length > 0
                ? m.relationFromFields[0]
                : undefined;
            out.push({
                name: fieldName,
                isList: !!m.isList,
                isRequired: !!m.isRequired,
                targetModel: String(m.type),
                fk,
                ui: m.ui,
            });
        }
    }

    // 2. Relations synthétiques (pour les FKs orphelines ex: "userId" sans relation "user" explicite)
    // C'est crucial pour votre logique "Data-Driven" qui repose sur la présence de FKs.
    const existingrels = new Set(out.map(r => r.fk).filter(Boolean));

    for (const [fieldName, meta] of Object.entries(modelDef)) {
        if (fieldName === 'ui') continue;
        const m = meta as any;
        if (m.relationName || m.isList || m.isId) continue; // Déjà traité ou pas pertinent
        if (String(m.type) !== 'String') continue; // Les FKs sont souvent des Strings (UUID/CUID)

        const name = String(fieldName);
        if (!name.endsWith('Id')) continue; // Convention de nommage

        const fk = name;
        if (existingrels.has(fk)) continue; // Déjà géré par une vraie relation

        const base = name.substring(0, name.length - 2); // "userId" -> "user"
        if (!base) continue;

        // On devine le modèle cible : "user" -> "User"
        const targetModel = base.charAt(0).toUpperCase() + base.slice(1);
        if (!modelNames.has(targetModel)) continue;

        out.push({
            name: base, // Le nom virtuel de la relation (ex: "user")
            isList: false,
            isRequired: !!m.isRequired,
            targetModel,
            fk, // La clé étrangère est le champ lui-même
            ui: m.ui,
        });
    }

    return out;
}

/**
 * Résout récursivement un libellé lisible (Preview) pour une entité donnée, à partir
 * des définitions de modèles enrichies (prisma-models.json + overrides).
 *
 * Algorithme:
 * 1. Si le modèle courant possède des champs scalaires marqués ui.preview=true, on
 *    concatène leurs valeurs (ordre par ui.order) et on retourne.
 * 2. Sinon, on cherche des champs relationnels marqués ui.preview=true; si la donnée
 *    relationnelle est présente, on appelle récursivement sur le modèle cible.
 * 3. Fallback: champs conventionnels (name, title, email, slug, label) puis id.
 */
export function resolveEntityPreview(
    data: any,
    modelName: string | undefined,
    defs: Record<string, any> | null | undefined,
    depth: number = 0
): string | undefined {
    if (data == null) return undefined;
    if (!modelName || !defs || !(defs as any)[modelName]) {
        // Fallback heuristics when model def missing
        return fallbackPreview(data);
    }

    // Prevent pathological cycles
    if (depth > 5) return fallbackPreview(data);

    const def: Record<string, any> = (defs as any)[modelName];
    const modelNames = new Set(Object.keys(defs as any));

    // 1) Scalar preview fields
    const scalarPreview = Object.entries(def)
        .filter(([k]) => k !== 'ui')
        .filter(([, f]) => {
            const meta = f as any;
            const isRelation = !!meta.relationName || (modelNames.has(String(meta.type)) && !meta.isList);
            return meta?.ui?.preview === true && !isRelation && !meta.isList;
        })
        .sort((a, b) => ((a[1] as any)?.ui?.order ?? 9999) - ((b[1] as any)?.ui?.order ?? 9999));
    if (scalarPreview.length > 0) {
        const parts: string[] = [];
        for (const [fieldName] of scalarPreview) {
            const v = data?.[fieldName];
            if (v != null && String(v).length > 0) parts.push(String(v));
        }
        if (parts.length > 0) return parts.join(' ');
    }

    // 2) Relational preview fields (recursive)
    const relationalPreview = Object.entries(def)
        .filter(([k]) => k !== 'ui')
        .filter(([, f]) => {
            const meta = f as any;
            const isRelation = !!meta.relationName || (modelNames.has(String(meta.type)) && !meta.isList);
            return meta?.ui?.preview === true && isRelation && !meta.isList;
        })
        .sort((a, b) => ((a[1] as any)?.ui?.order ?? 9999) - ((b[1] as any)?.ui?.order ?? 9999));
    for (const [fieldName, metaAny] of relationalPreview) {
        const child = data?.[fieldName];
        if (child == null) continue;
        const targetModel = String((metaAny as any)?.type ?? '');
        const resolved = resolveEntityPreview(child, targetModel, defs, depth + 1);
        if (resolved && resolved.length > 0) return resolved;
    }

    // 3) Fallback
    return fallbackPreview(data);
}

function fallbackPreview(obj: any): string | undefined {
    const v = obj?.name ?? obj?.title ?? obj?.email ?? obj?.slug ?? obj?.label ?? obj?.id;
    return v != null ? String(v) : undefined;
}