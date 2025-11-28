import {atom} from 'nanostores';
import {actions} from 'astro:actions';
import {modelsService, modelsStore} from '@/stores/modelsStore.ts';
import {getModelRelations} from '@/utils/modelUtils.ts';

// Store plat: clé = formId (ex: "root.client.user"), valeur = objet de brouillon
export const draftsStore = atom<Record<string, any>>({});

// Helper récursif (privé) pour créer une entité et toutes ses dépendances singulières (bottom-up)
// - formId: identifiant du formulaire courant (ex: "root", "root.client")
// - model: nom du modèle courant (ex: "Deal")
// - store: snapshot des brouillons (ne pas lire directement draftsStore dans la récursion)
// - defs: définitions de modèles complètes (prisma-models.json chargées)
async function processEntityCreation(
    formId: string,
    model: string,
    store: Record<string, any>,
    defs: Record<string, any> | undefined,
): Promise<{ id: string | undefined; data: any }> {
    const parentData = {...(store[formId] || {})};
    const relations = getModelRelations(defs, model);

    // Traiter d'abord toutes les relations singulières en CREATE (présence d'un brouillon enfant)
    for (const ri of relations) {
        if (ri.isList) continue; // Listes ignorées ici (nested writes côté parent si besoin)
        if (!ri.fk) continue;    // Sans FK côté parent, rien à peupler
        const childFormId = `${formId}.${ri.name}`;
        const childDraft = store[childFormId];

        if (childDraft) {
            // Récursion: créer l'enfant avant le parent
            const childRes = await processEntityCreation(childFormId, ri.targetModel, store, defs);
            const newChildId = childRes?.id;
            if (newChildId) {
                (parentData as any)[ri.fk] = newChildId;
            }
        }
    }

    // Créer l'entité courante une fois les FK injectées
    const created = await (actions as any).createEntity({
        model,
        dataJson: JSON.stringify(parentData || {}),
    } as any);
    const createdData = (created as any)?.data || created;
    const newId = (createdData as any)?.created?.id || (createdData as any)?.id || (created as any)?.created?.id;
    return {id: newId, data: createdData};
}

export const draftsService = {
    update(id: string, data: Record<string, any>) {
        const current = draftsStore.get();
        draftsStore.set({...current, [id]: {...(data || {})}});
    },
    get<T = any>(id: string): T | undefined {
        const current = draftsStore.get();
        return current[id] as T | undefined;
    },
    // clearChildren: supprime aussi toutes les clés commençant par `${id}.`
    clear(id: string, clearChildren: boolean = true) {
        const current = draftsStore.get();
        const next: Record<string, any> = {...current};
        delete next[id];
        if (clearChildren) {
            const prefix = id + '.';
            for (const k of Object.keys(next)) {
                if (k.startsWith(prefix)) delete next[k];
            }
        }
        draftsStore.set(next);
    },
    // Sauvegarde récursive: crée d'abord les enfants (profondeur arbitraire), puis le parent. Ignore les listes.
    async save(args: { formId: string; model: string; }) {
        const {formId, model} = args;
        // S'assurer que les defs sont chargées (utiles si le service est appelé tôt)
        let defs = modelsStore.get().models as Record<string, any> | null;
        if (!defs) {
            try {
                await modelsService.load();
            } catch {
            }
            defs = modelsStore.get().models as Record<string, any> | null;
        }
        const snapshot = draftsStore.get();

        // Laisser remonter toute erreur (pas de try/catch silencieux)
        const res = await processEntityCreation(formId, model, snapshot, defs || undefined);
        if (res?.data) {
            // Nettoyer ce formulaire et tous ses enfants utilisés
            draftsService.clear(formId, true);
        }
        return res?.data;
    }
};
