import React, {useEffect, useState} from 'react';
// Global search bar removed per new requirements
import useDynamicList from './useDynamicList.ts';
import {useStore} from "@nanostores/react";
import {modelsService, modelsStore} from '@/stores/modelsStore.ts';
import {Card, IconButton,} from "@udixio/ui-react";
import {FieldRenderer} from "@components/app/form/FieldRenderer.tsx";
import {getModelRelations} from '@/utils/modelUtils.ts';
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
    rowRenderer: (row: any) => Record<string, { value: any }>
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

export default function DynamicDataView({model, presets, pageSize = 25, rowActions, columns, rowRenderer}: Props) {
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
            <Card variant={"filled"} className="bg-surface-container">
                <table className="min-w-[720px] ">
                    <thead className={""}>
                    <tr className="border-b border-outline">
                        {columns.map((c) => {
                            const isSorted = sortField === c.key;
                            const indicator = isSorted ? (sortDir === 'asc' ? ' ▲' : (sortDir === 'desc' ? ' ▼' : '')) : '';

                            return (
                                <th key={c.key} className="text-left align-top p-2">
                                    <div className="flex items-center gap-2">
                                        <button
                                            className="underline-offset-2 hover:underline"

                                            type="button"
                                        >
                                            {c.label}{indicator}
                                        </button>
                                    </div>
                                    <div className="mt-1">
                                        {/* Utilise FieldRenderer en mode standalone pour un filtre typé */}
                                        {/* @ts-ignore */}
                                        <FieldRenderer
                                            meta={{...((c as any).field), name: c.key}}
                                            defs={models as any}
                                            value={pendingFilters[c.key] ?? ''}
                                            onChange={(v: any) => onChangeColFilter(c.key, v)}
                                        />
                                    </div>
                                </th>
                            );
                        })}
                        {columns.filter(c => c.kind === 'inline').map(() => null) /* no-op to satisfy TS */}
                        {actionsCol === 1 && (
                            <th className="border border-outline text-left align-top p-2 w-[1%] whitespace-nowrap">Actions</th>
                        )}
                    </tr>
                    </thead>
                    <tbody>
                    {loading && (
                        <tr>
                            <td className="border border-outline p-3"
                                colSpan={columns.length + actionsCol}>Chargement…
                            </td>
                        </tr>
                    )}
                    {!loading && items.length === 0 && (
                        <tr>
                            <td className="border border-outline p-3" colSpan={columns.length + actionsCol}>Aucun
                                élément
                            </td>
                        </tr>
                    )}
                    {!loading && items.map((row: any) => {
                        const acts = rowActions ? rowActions(row) ?? [] : [];
                        const rowData = rowRenderer(row)
                        return (
                            <tr
                                key={row.id ?? JSON.stringify(row)}
                                className="group border-t border-outline-variant "
                                onDoubleClick={() => {
                                    if (acts.length > 0) {
                                        try {
                                            acts[0].onClick(row);
                                        } catch {
                                        }
                                    }
                                }}
                            >
                                {columns.map((c) => {
                                    const columnData = rowData[c.key];

                                    if (columnData === undefined) return (
                                        <td className="align-top p-2" key={c.key}>
                                            ?
                                        </td>
                                    )

                                    const {value} = columnData;
                    
                                    return (
                                        <td className="align-top p-2" key={c.key}>
                                            {value}
                                        </td>
                                    )
                                })}
                                {actionsCol === 1 && (
                                    <td className=" align-top p-2">
                                        <div
                                            className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {acts.map((a, idx) => (
                                                <IconButton variant={"tonal"} size={"small"} key={idx} icon={a.icon}
                                                            onClick={a.onClick ? a.onClick(row) : undefined}
                                                            href={a.href ? a.href(row) : undefined}>{a.label}</IconButton>
                                            ))}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </Card>

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
