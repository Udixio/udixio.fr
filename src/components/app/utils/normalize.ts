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
export async function buildRelationPayload(
    base: Record<string, any>,
    relations: any[],
    relationState: Record<string, any>,
    createEntityAction: (payload: any) => Promise<any>,
    createEntityRes: any,
) {

    console.log('relationState', {
        base,
        relations,
        relationState,
        createEntityAction,
        createEntityRes
    });
    const normalized = {...(base || {})};
    for (const rf of relations) {
        const st = relationState[rf.name];
        if (!st) continue;
        if (!rf.isList) {
            if (!rf.fk) continue;
            if (st.mode === 'associate' && st.selectedId) {
                normalized[rf.fk] = st.selectedId;
            } else if (st.mode === 'create' && st.createValues) {
                try {
                    const created = await createEntityAction({
                        model: rf.targetModel,
                        dataJson: JSON.stringify(st.createValues)
                    } as any);
                    const newId = (created as any)?.data?.created?.id || (createEntityRes as any)?.data?.created?.id;
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

    console.log('normalized', normalized);
    return normalized;
}
