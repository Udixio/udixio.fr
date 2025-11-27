import {actions} from 'astro:actions';
import {draftsService} from '@/stores/draftsStore.ts';

// Normalize scalar values based on field types
export function normalizeScalarValues(values: Record<string, any>, scalarFields: any[]) {
    const normalized: Record<string, any> = {...(values || {})};
    for (const f of scalarFields) {
        const name = f.name as string;
        const t = String(f.type);
        const v = normalized[name];
        if (v === '' || v === undefined) {
            continue;
        }
        try {
            if (t === 'Int' || t === 'BigInt') normalized[name] = Number.parseInt(String(v));
            else if (t === 'Float' || t === 'Decimal') normalized[name] = Number.parseFloat(String(v));
            else if (t === 'Boolean') normalized[name] = Boolean(v);
            else if (t === 'DateTime') {
                const d = new Date(v);
                if (!isNaN(d.getTime())) normalized[name] = d.toISOString();
            } else if (t === 'Json' && typeof v === 'string') {
                try {
                    normalized[name] = JSON.parse(v);
                } catch {
                    // keep as string if invalid
                }
            }
        } catch {
            // keep value as-is on failure
        }
    }
    return normalized;
}

// Build relation payload (connect/create) and assign FK for singular relations
// Important: uses direct Astro actions invocation (await) to avoid React useActionState timing issues
export async function buildRelationPayload(
    base: Record<string, any>,
    relations: any[],
    relationState: Record<string, any>,
    // optional override for testing/injection
    createFn?: (payload: any) => Promise<any>,
    formId?: string,
) {

    // Préférer la valeur du store si un formId est fourni
    const rootVals = formId ? (draftsService.get<Record<string, any>>(formId) ?? base) : base;

    const normalized = {...(rootVals || {})};
    for (const rf of relations) {
        const st = relationState[rf.name];
        if (!st) continue;
        if (!rf.isList) {
            if (!rf.fk) continue;
            if (st.mode === 'associate' && st.selectedId) {
                normalized[rf.fk] = st.selectedId;
            } else if (st.mode === 'create') {
                try {
                    const doCreate = createFn || (actions as any).createEntity;
                    // Récupérer les valeurs du formulaire enfant depuis le store si possible
                    const childId = formId ? `${formId}.${rf.name}` : undefined;
                    const childValuesFromStore = childId ? draftsService.get<Record<string, any>>(childId) : undefined;
                    const childValues = childValuesFromStore ?? st.createValues;
                    if (!childValues || Object.keys(childValues).length === 0) {
                        // rien à créer
                        continue;
                    }
                    const created = await doCreate({
                        model: rf.targetModel,
                        dataJson: JSON.stringify(childValues)
                    } as any);
                    const newId = (created as any)?.data?.created?.id || (created as any)?.data?.id || (created as any)?.created?.id;
                    if (newId) normalized[rf.fk] = newId;
                } catch {
                    // swallow – let parent submit handler deal with errors
                }
            }
        } else {
            const connectIds = Array.isArray(st.selectedIds) ? st.selectedIds : [];
            const createItems = Array.isArray(st.createItems) ? st.createItems : [];
            const payload: any = {};
            if (connectIds.length > 0) payload.connect = connectIds.map((id: string) => ({id}));
            if (createItems.length > 0) payload.create = createItems;
            if (payload.connect || payload.create) {
                (normalized as any)[rf.name] = payload;
            }
        }
    }

    return normalized;
}
