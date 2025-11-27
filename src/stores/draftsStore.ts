import { atom } from 'nanostores';

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
};
