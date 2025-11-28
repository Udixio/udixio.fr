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