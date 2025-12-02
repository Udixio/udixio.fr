import React, {type ReactNode, useEffect, useState} from 'react';
// Global search bar removed per new requirements
import useDynamicList from './useDynamicList.ts';
import {useStore} from "@nanostores/react";
import {modelsService, modelsStore} from '@/stores/modelsStore.ts';
import {getModelRelations} from '@/lib/modelUtils.ts';
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
    model: string;
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

export default function DynamicView({model, presets, pageSize = 25, rowActions, columns, entityRender}: Props) {
    const list = useDynamicList<any>(model, {limit: pageSize});


    const {models} = useStore(modelsStore);
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


    // Charger les modèles une seule fois si absents
    useEffect(() => {
        if (!models) {
            void modelsService.load();
        }
    }, [models]);

    // Build include for single relations to improve preview rendering
    useEffect(() => {
        const defs = (models as any);
        if (!defs || !defs[model]) return;
        const rels = getModelRelations(defs, model).filter(r => !r.isList);
        if (rels.length === 0) return;
        const include: Record<string, any> = {};
        for (const r of rels) include[r.name] = true;
        list.setInclude(include);
    }, [models, model]);

    // Compose where filter = per-column filters only (global search removed)
    useEffect(() => {
        const defs: any = (models as any)?.[model];
        const entries = Object.entries(colFilters)
            .filter(([, v]) => v !== undefined && v !== null && String(v).trim().length > 0) as [string, any][];

        const conds = entries
            .map(([key, raw]) => buildWhereForColumn({
                key,
                rawValue: raw,
                model,
                models: models as any,
                columns,
            }))
            .filter(Boolean) as any[];

        // Fusion avec le filtre preset si présent
        let where: any = {};
        if (presetFilter && conds.length > 0) {
            where = {AND: [presetFilter, ...conds]};
        } else if (presetFilter) {
            where = presetFilter;
        } else if (conds.length > 0) {
            where = {AND: conds};
        }
        list.setFilter(where);
    }, [colFilters, models, model, presetFilter, columns]);

    // Apply sorting whenever local sort state changes
    useEffect(() => {
        list.setSort(sortField, sortDir);
    }, [sortField, sortDir]);

    const {items, total, loading, page} = list;
    const maxPage = Math.max(1, Math.ceil(total / list.limit));
    const actionsCol = typeof rowActions === 'function' ? 1 : 0;

    return (
        <div className="space-y-3">
            {Array.isArray(presets) && presets.length > 0 && (
                <DynamicPresets presets={presets as any} onFilter={(f) => setPresetFilter(f)}/>
            )}
            <div className="grid grid-cols-2 gap-4 ">

                {!loading && items.map((row: any) => {
                    return entityRender(row)
                })}
            </div>

            <div className="flex items-center gap-2">
                <button className="border border-outline px-3 py-1" disabled={page <= 1}
                        onClick={list.prevPage}>Précédent
                </button>
                <span className="text-sm">Page {page} / {maxPage}</span>
                <button className="border border-outline px-3 py-1" disabled={page >= maxPage}
                        onClick={list.nextPage}>Suivant
                </button>
                <span className="ml-auto text-sm text-gray-600">{total} total</span>
            </div>
        </div>
    );
}
