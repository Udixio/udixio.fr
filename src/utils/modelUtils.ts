// Utilitaires liés aux métadonnées modèles (defs générées depuis Prisma)

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
  for (const [fieldName, meta] of Object.entries(modelDef)) {
    if (fieldName === 'ui') continue; // bloc UI modèle
    // champ relationnel si son type correspond à un autre modèle connu
    const typeName = String((meta as any)?.type || '');
    const isRelation = modelNames.has(typeName) && ((meta as any)?.relationName !== undefined || (meta as any)?.relationFromFields !== undefined || (meta as any)?.relationToFields !== undefined);
    if (!isRelation) continue;
    const isList = !!(meta as any)?.isList;
    const isRequired = !!(meta as any)?.isRequired;
    const fk = Array.isArray((meta as any)?.relationFromFields) ? (meta as any).relationFromFields[0] : undefined;
    out.push({
      name: fieldName,
      isList,
      isRequired,
      targetModel: typeName,
      fk,
      ui: (meta as any)?.ui,
    });
  }
  return out;
}
