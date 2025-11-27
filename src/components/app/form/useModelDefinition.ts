import {useMemo} from "react";

type UseModelDefinitionParams = {
    model: string;
    defs: Record<string, any> | null | undefined;
    exclude?: string[];
    mode?: 'create' | 'update';
    relationsDepth?: number; // 0 => none, -1 => unlimited
    ancestors?: string[];
};

export function useModelDefinition({
                                       model,
                                       defs,
                                       exclude,
                                       mode = 'create',
                                       relationsDepth = -1,
                                       ancestors = []
                                   }: UseModelDefinitionParams) {
    return useMemo(() => {
        if (!defs) return {
            scalarFields: [] as any[],
            relations: [] as any[],
            relationGroups: [] as { key: string; items: any[] }[],
            defs: undefined as any,
            modelUI: undefined as any,
        };

        const rec = (defs as any)[model] || {};
        const modelUI = (rec as any)?.ui;

        // Build list of fields, ignoring model-level `ui` and entries without a valid prisma-ish type
        let list = Object.entries(rec)
            .filter(([name]) => name !== 'ui')
            .map(([name, meta], idx) => ({__index: idx, name, ...(meta as any)}))
            .filter((f: any) => typeof f?.type === 'string' || typeof f?.relationName === 'string');

        // Filter hidden and excluded
        list = list.filter(f => !(f.ui?.hidden === true) && !(exclude?.includes(f.name)));

        // Scalars
        let scalars = list.filter(f => !f.relationName && !f.isList && !f.isId && !(mode === 'update' && f.isReadOnly));
        // Sort scalars: ui.order if defined, otherwise JSON appearance via __index
        scalars.sort((a: any, b: any) => {
            const ao = a?.ui?.order;
            const bo = b?.ui?.order;
            const aHas = ao !== undefined && ao !== null;
            const bHas = bo !== undefined && bo !== null;
            if (aHas && bHas) return (ao as number) - (bo as number);
            if (aHas && !bHas) return -1;
            if (!aHas && bHas) return 1;
            return (a.__index ?? 0) - (b.__index ?? 0);
        });

        // Relations (unified)
        let relations = list.filter(f => !!f.relationName).map(f => ({
            ...f,
            isList: !!f.isList,
            targetModel: String(f.type),
            fk: !f.isList && Array.isArray(f.relationFromFields) && f.relationFromFields.length > 0 ? f.relationFromFields[0] : undefined,
        }));


        // Add synthetic relations for orphan scalar FKs (like userId)
        try {
            const defModels = new Set(Object.keys(defs || {}));
            for (const f of list) {
                if (f.relationName || f.isList || f.isId) continue;
                if (String(f.type) !== 'String') continue;
                const name: string = String(f.name);
                if (!name.endsWith('Id')) continue;
                const fk = name;
                if (relations.some((r: any) => r.fk === fk)) continue;
                const base = name.substring(0, name.length - 2);
                if (!base) continue;
                const targetModel = base.charAt(0).toUpperCase() + base.slice(1);
                if (!defModels.has(targetModel)) continue;
                relations.push({
                    ...f,
                    name: base,
                    isList: false,
                    targetModel,
                    fk,
                    relationName: f.relationName || undefined,
                    __synthetic: true,
                } as any);
            }
        } catch {
        }

        // Hide scalar FK fields that are handled by relation sections
        const fkNames = new Set(relations.filter((r: any) => !r.isList).map((r: any) => r.fk).filter(Boolean) as string[]);
        scalars = scalars.filter(s => !fkNames.has(s.name));

        // Exclude back-relations to ancestor models (avoid 2-way loops)
        try {
            const ancestorSet = new Set((ancestors || []).map(String));
            relations = relations.filter((r: any) => !ancestorSet.has(String(r.targetModel)));
        } catch {
        }

        // Apply relationsDepth: 0 => no relations
        if ((relationsDepth ?? 0) === 0) {
            return {scalarFields: scalars, relations: [] as any[], relationGroups: [], defs, modelUI};
        }

        // Build relationGroups (mutex groups and singles) with stable order
        const groups: { key: string; items: any[] }[] = [];
        const orderKeys: string[] = [];
        const map: Record<string, any[]> = {};
        for (const rf of relations) {
            const key = rf?.ui?.mutexKey ? `mutex:${rf.ui.mutexKey}` : `single:${rf.name}`;
            if (!map[key]) {
                map[key] = [];
                orderKeys.push(key);
            }
            map[key].push(rf);
        }
        for (const k of orderKeys) groups.push({key: k, items: map[k]});

        // Sort items within each group by ui.order then __index
        for (const g of groups) {
            g.items.sort((a: any, b: any) => {
                const ao = a?.ui?.order;
                const bo = b?.ui?.order;
                const aHas = ao !== undefined && ao !== null;
                const bHas = bo !== undefined && bo !== null;
                if (aHas && bHas) return (ao as number) - (bo as number);
                if (aHas && !bHas) return -1;
                if (!aHas && bHas) return 1;
                return (a.__index ?? 0) - (b.__index ?? 0);
            });
        }
        // Sort groups by min order then min __index
        groups.sort((ga, gb) => {
            const aOrders = ga.items.map((it: any) => it?.ui?.order).filter((v: any) => v !== undefined && v !== null);
            const bOrders = gb.items.map((it: any) => it?.ui?.order).filter((v: any) => v !== undefined && v !== null);
            if (aOrders.length > 0 && bOrders.length > 0) {
                const mina = Math.min(...(aOrders as number[]));
                const minb = Math.min(...(bOrders as number[]));
                if (mina !== minb) return mina - minb;
            } else if (aOrders.length > 0) {
                return -1;
            } else if (bOrders.length > 0) {
                return 1;
            }
            const minaIdx = Math.min(...ga.items.map((it: any) => it.__index ?? 0));
            const minbIdx = Math.min(...gb.items.map((it: any) => it.__index ?? 0));
            if (minaIdx !== minbIdx) return minaIdx - minbIdx;
            const ama = ga.key.startsWith('mutex:') ? 0 : 1;
            const amb = gb.key.startsWith('mutex:') ? 0 : 1;
            if (ama !== amb) return ama - amb;
            return 0;
        });

        return {scalarFields: scalars, relations, relationGroups: groups, defs, modelUI};
    }, [model, defs, JSON.stringify(exclude), mode, relationsDepth, JSON.stringify(ancestors)]);
}

// Utilities re-usable by DynamicForm and sub-components
export const getPreviewKeysFromDefs = (defs: Record<string, any> | null | undefined, targetModel: string): string[] => {
    try {
        const modelDef = (defs as any)?.[targetModel];
        if (!modelDef) return [];
        const keys = Object.entries(modelDef)
            .filter(([k, v]: any) => k !== 'ui')
            .map(([k, v]: any) => ({name: k, meta: v}))
            .filter((f: any) => !f.meta?.relationName && typeof f.meta?.type === 'string')
            .filter((f: any) => !(f.meta?.ui?.hidden))
            .filter((f: any) => !!f.meta?.ui?.preview)
            .map((f: any) => f.name as string);
        return keys as string[];
    } catch {
        return [];
    }
};

export const makePreviewLabelFromDefs = (defs: Record<string, any> | null | undefined, targetModel: string, it: any): string => {
    const keys = getPreviewKeysFromDefs(defs, targetModel);
    let label = '';
    if (keys.length > 0) label = keys.map((k) => it?.[k]).filter(Boolean).join(' · ');
    if (!label) label = it?.name || it?.title || it?.email || it?.slug || it?.id || '';
    return label;
};
