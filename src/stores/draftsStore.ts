import { atom } from 'nanostores';
import {actions} from 'astro:actions';
import {modelsService, modelsStore} from '@/stores/modelsStore.ts';
import {getModelRelations} from '@/utils/modelUtils.ts';

// Store plat: clé = formId (ex: "root.client.user"), valeur = objet de brouillon
export const draftsStore = atom<Record<string, any>>({});

export const draftsService = {
  update(id: string, data: Record<string, any>) {
    const current = draftsStore.get();
    draftsStore.set({ ...current, [id]: { ...(data || {}) } });
  },
  get<T = any>(id: string): T | undefined {
    const current = draftsStore.get();
    return current[id] as T | undefined;
  },
  // clearChildren: supprime aussi toutes les clés commençant par `${id}.`
  clear(id: string, clearChildren: boolean = true) {
    const current = draftsStore.get();
    const next: Record<string, any> = { ...current };
    delete next[id];
    if (clearChildren) {
      const prefix = id + '.';
      for (const k of Object.keys(next)) {
        if (k.startsWith(prefix)) delete next[k];
      }
    }
    draftsStore.set(next);
  },
  // Sauvegarde centralisée data-driven: lit les données du store, crée d'abord les enfants singuliers si un brouillon existe,
  // renseigne la FK sur le parent, puis crée le parent. Les listes ne sont pas traitées ici (nested writes non couverts).
  async save(args: { formId: string; model: string; }) {
    const { formId, model } = args;
    const store = draftsStore.get();
    const parentData = { ...(store[formId] || {}) };
    let defs = modelsStore.get().models as Record<string, any> | null;
    if (!defs) {
      try { await modelsService.load(); } catch {}
      defs = modelsStore.get().models as Record<string, any> | null;
    }
    const relations = getModelRelations(defs || undefined, model);

    // Pour chaque relation singulière, si un brouillon enfant existe → créer l'enfant et poser la FK
    for (const ri of relations) {
      if (ri.isList) continue;
      if (!ri.fk) continue;
      const childFormId = `${formId}.${ri.name}`;
      const childDraft = store[childFormId];
      if (childDraft && Object.keys(childDraft || {}).length > 0) {
        try {
          const created = await (actions as any).createEntity({
            model: ri.targetModel,
            dataJson: JSON.stringify(childDraft || {})
          } as any);
          const newId = (created as any)?.data?.created?.id || (created as any)?.data?.id || (created as any)?.created?.id;
          if (newId) {
            (parentData as any)[ri.fk] = newId;
            // Nettoyer le brouillon enfant une fois utilisé
            draftsService.clear(childFormId, true);
          }
        } catch {
          // laisser la gestion d'erreur au niveau appelant si besoin
        }
      }
    }

    // Créer le parent
    const created = await (actions as any).createEntity({
      model,
      dataJson: JSON.stringify(parentData || {}),
    } as any);
    const createdData = (created as any)?.data || created;
    if (createdData) {
      // Nettoyer ce formulaire et tous ses enfants
      draftsService.clear(formId, true);
    }
    return createdData;
  }
};
