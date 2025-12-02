import React, {type ReactNode, useEffect, useRef, useState} from 'react';
// Global search bar removed per new requirements
import useActionList, {type ActionListParams, type ActionListResult} from './useActionList.ts';
import DynamicPresets from './DynamicPresets.tsx';
import type {IconDefinition} from "@fortawesome/pro-light-svg-icons";


type ModelField = {
    type: string;
    isId?: boolean;
    isList?: boolean;
    relationName?: string | null;
    ui?: { preview?: boolean; label?: string | null; order?: number; mutexKey?: string };
};

type ModelDefinition = Record<string, ModelField>;

type RowAction = { label: string; icon?: IconDefinition; onClick?: (row: any) => void, href?: (row: any) => string };

type Props = {
    // Remplace l'ancien props `model` par une action fetcher
    action: (params: ActionListParams) => Promise<ActionListResult<any> | undefined>;
    entityRender: (row: any) => ReactNode
    columns: { key: string; label: string }[]
    // Sélecteur de vues rapides (presets) pour appliquer un where JSON complexe
    presets?: Array<{ label: string; filter: object }>; // optionnel
    pageSize?: number;
    rowActions?: (row: any) => RowAction[];
};

function isScalarField(f: ModelField) {
    return !f.isList && !f.relationName; // déduction: pas une relation et non-list => scalaire
}

type ColumnDefField = { key: string; label: string; kind: 'field'; field: ModelField; order: number };
type ColumnDefMutex = { key: string; label: string; kind: 'mutex'; members: string[]; order: number; mutexKey: string };
type ColumnDefInline = {
    key: string;
    label: string;
    kind: 'inline';
    order: number;
    parent: string;
    childKey: string;
    childField: ModelField;
};
type ColumnDef = ColumnDefField | ColumnDefMutex | ColumnDefInline;

export default function DynamicView({action, presets, pageSize = 25, rowActions, columns, entityRender}: Props) {
    const list = useActionList<any>(action, {limit: pageSize});


    const [colFilters, setColFilters] = useState<Record<string, any>>({});
    const [presetFilter, setPresetFilter] = useState<Record<string, any> | undefined>(undefined);
    const [sortField, setSortField] = useState<string | undefined>(undefined);
    const [sortDir, setSortDir] = useState<'asc' | 'desc' | undefined>(undefined);


    // debounce column filters (UI local state to avoid triggering API on every keypress)
    const [pendingFilters, setPendingFilters] = useState<Record<string, any>>(colFilters);
    useEffect(() => setPendingFilters(colFilters), [columns.length]);
    useEffect(() => {
        const t = setTimeout(() => {
            setColFilters(pendingFilters);
        }, 500);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingFilters]);

    function onChangeColFilter(fieldKey: string, value: any) {
        setPendingFilters(prev => ({...prev, [fieldKey]: value}));
    }


    // Optionnellement, un include custom pourrait être passé via presets côté action.

    // Compose where filter = per-column filters only (global search removed)
    useEffect(() => {
        // Construction minimaliste d'un where à partir des filtres colonnes
        const entries = Object.entries(colFilters)
            .filter(([, v]) => v !== undefined && v !== null && String(v).toString().trim().length > 0) as [string, any][];

        const conds = entries.map(([key, value]) => ({[key]: value}));

        let where: any = {};
        if (presetFilter && conds.length > 0) {
            where = {AND: [presetFilter, ...conds]};
        } else if (presetFilter) {
            where = presetFilter;
        } else if (conds.length > 0) {
            where = {AND: conds};
        }
        list.setFilter(where);
    }, [colFilters, presetFilter, columns]);

    // Apply sorting whenever local sort state changes
    useEffect(() => {
        list.setSort(sortField, sortDir);
    }, [sortField, sortDir]);

    const {items, total, loading, page, hasMore} = list;
    const actionsCol = typeof rowActions === 'function' ? 1 : 0;

    // Infinite scroll sentinel
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;
        const io = new IntersectionObserver((entries) => {
            const first = entries[0];
            if (first.isIntersecting && hasMore && !loading) {
                list.loadMore();
            }
        }, {root: null, rootMargin: '200px', threshold: 0});
        io.observe(el);
        return () => io.disconnect();
    }, [hasMore, loading, list]);

    return (
        <div className="space-y-3">
            {Array.isArray(presets) && presets.length > 0 && (
                <DynamicPresets presets={presets as any} onFilter={(f) => setPresetFilter(f)}/>
            )}
            <div className="grid grid-cols-2 gap-4 ">
                {items.map((row: any) => {
                    return entityRender(row)
                })}
            </div>

            <div className="flex items-center gap-2">
                <span className="text-sm">Chargement: {loading ? 'oui' : 'non'}</span>
                <span className="ml-auto text-sm text-gray-600">{total} total</span>
            </div>
            {/* Sentinel pour le scroll infini */}
            <div ref={sentinelRef} />
        </div>
    );
}
