import { atom } from 'nanostores';
import {actions} from 'astro:actions';
import {buildRelationPayload} from '@/components/app/utils/normalize.ts';

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
  // Sauvegarde centralisée: lit les données du store, construit le payload (deep create), appelle l'API, nettoie le store
  async save(args: {
    formId: string;
    model: string;
    relations: any[];
    relationState: Record<string, any>;
  }) {
    const {formId, model, relations, relationState} = args;
    const base = draftsStore.get()?.[formId] ?? {};
    // Construit le payload en lisant récursivement les brouillons enfants depuis le store
    const payload = await buildRelationPayload(base, relations, relationState, undefined, formId);
    const created = await (actions as any).createEntity({
      model,
      dataJson: JSON.stringify(payload || {}),
    } as any);
    const createdData = (created as any)?.data || created;
    if (createdData) {
      // Nettoyer ce formulaire et tous ses enfants
      draftsService.clear(formId, true);
    }
    return createdData;
  }
};
