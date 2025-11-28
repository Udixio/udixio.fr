import React, {useEffect, useMemo, useState} from 'react';
// Global search bar removed per new requirements
import useDynamicList from './useDynamicList.ts';
import {useStore} from "@nanostores/react";
import {modelsService, modelsStore} from '@/stores/modelsStore.ts';
import {Card} from "@udixio/ui-react";
import {getModelRelations} from '@/utils/modelUtils.ts';

type ModelField = {
    type: string;
    isId?: boolean;
    isList?: boolean;
    relationName?: string | null;
    ui?: { preview?: boolean; label?: string | null; order?: number };
};

type ModelDefinition = Record<string, ModelField>;

type RowAction = { label: string; icon?: React.ReactNode; onClick: (row: any) => void };

type Props = {
    model: string;
    // presets conservé pour compat, non utilisé depuis la suppression de la recherche globale
    presets?: Array<{ label: string; filter: object }>; // optional, ignored
    pageSize?: number;
    rowActions?: (row: any) => RowAction[];
};

function isScalarField(f: ModelField) {
    return !f.isList && !f.relationName; // déduction: pas une relation et non-list => scalaire
}

export default function DynamicDatatable({model, presets, pageSize = 25, rowActions}: Props) {
    const list = useDynamicList<any>(model, {limit: pageSize});
    const {models} = useStore(modelsStore);
    const [colFilters, setColFilters] = useState<Record<string, string>>({});
    const [sortField, setSortField] = useState<string | undefined>(undefined);
    const [sortDir, setSortDir] = useState<'asc' | 'desc' | undefined>(undefined);

    // Compute columns early so effects can safely depend on it
    const columns = useMemo(() => {
        const defs: ModelDefinition | undefined = (models as any)?.[model];
        const fields = defs ?? {};
        const entries = Object.entries(fields);
        if (entries.length === 0) return [] as { key: string; label: string; field: ModelField }[];

        const idFields = entries.filter(([, f]) => f.isId);
        const hasPreview = entries.some(([, f]) => f.ui?.preview === true);
        let chosen = entries.filter(([name, f]) => {
            if (hasPreview) return f.ui?.preview === true || f.isId;
            // keep scalar-like fields and id as fallback
            return f.isId || (isScalarField(f));
        });

        // sort by ui.order then name for stability
        chosen.sort((a, b) => {
            const ao = a[1].ui?.order ?? 9999;
            const bo = b[1].ui?.order ?? 9999;
            if (ao !== bo) return ao - bo;
            return a[0].localeCompare(b[0]);
        });

        // Ensure at least one id field exists
        if (!chosen.some(([, f]) => f.isId) && idFields.length > 0) {
            chosen = [idFields[0], ...chosen];
        }

        return chosen.map(([key, field]) => ({
            key,
            field,
            label: field.ui?.label ?? key,
        }));
    }, [models, model]);

    // debounce column filters (UI local state to avoid triggering API on every keypress)
    const [pendingFilters, setPendingFilters] = useState(colFilters);
    useEffect(() => setPendingFilters(colFilters), [columns.length]);
    useEffect(() => {
        const t = setTimeout(() => {
            setColFilters(pendingFilters);
        }, 500);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingFilters]);

    function onChangeColFilter(fieldKey: string, value: string) {
        setPendingFilters(prev => ({...prev, [fieldKey]: value}));
    }

    function toggleSort(fieldKey: string) {
        if (sortField !== fieldKey) {
            setSortField(fieldKey);
            setSortDir('asc');
            return;
        }
        // cycle asc -> desc -> none
        if (sortDir === 'asc') {
            setSortDir('desc');
        } else if (sortDir === 'desc') {
            setSortField(undefined);
            setSortDir(undefined);
        } else {
            setSortDir('asc');
        }
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
        const modelNames = models ? new Set(Object.keys(models as any)) : new Set<string>();
        const entries = Object.entries(colFilters).filter(([, v]) => v && v.trim().length > 0) as [string, string][];

        const conds = entries.map(([key, raw]) => {
            const meta: any = defs?.[key];
            const type: string = String(meta?.type ?? 'String');
            const val = raw.trim();

            // Booléen strict
            if (type === 'Boolean') {
                const low = val.toLowerCase();
                const truthy = ['true', '1', 'yes', 'y', 'on'];
                const falsy = ['false', '0', 'no', 'n', 'off'];
                let b: boolean | undefined;
                if (truthy.includes(low)) b = true;
                else if (falsy.includes(low)) b = false;
                // Si non reconnu, ne renvoie pas de condition (évite erreurs)
                if (b === undefined) return undefined as any;
                return { [key]: { equals: b } };
            }

            // String => contains insensible à la casse
            if (type === 'String') {
                return { [key]: { contains: val, mode: 'insensitive' } };
            }

            // Si le type correspond à un autre modèle, on évite (le filtrage relationnel n'est pas géré ici)
            if (modelNames.has(type)) {
                // fallback: essaie sur la FK conventionnelle `${key}Id`
                const fk = `${key}Id`;
                if (defs?.[fk]?.type === 'String') {
                    return { [fk]: { contains: val, mode: 'insensitive' } };
                }
                return undefined as any;
            }

            // Enum ou autres scalaires (Int, Decimal, DateTime, etc.) => equals
            // Tentative de coercition pour les numériques
            if (type === 'Int' || type === 'BigInt' || type === 'Float' || type === 'Decimal') {
                const n = Number(val);
                if (!Number.isNaN(n)) return { [key]: { equals: n } };
                return undefined as any;
            }
            // DateTime/Date: laissez equals string (Prisma tentera de parser si ISO)
            return { [key]: { equals: val } };
        }).filter(Boolean);

        const where = conds.length > 0 ? { AND: conds } : {};
        list.setFilter(where);
    }, [colFilters, models, model]);

    // Apply sorting whenever local sort state changes
    useEffect(() => {
        list.setSort(sortField, sortDir);
    }, [sortField, sortDir]);

    const {items, total, loading, page} = list;
    const maxPage = Math.max(1, Math.ceil(total / list.limit));
    const actionsCol = typeof rowActions === 'function' ? 1 : 0;

    return (
        <div className="space-y-3">
            <Card variant={"filled"} className="overflow-auto">
                <table className="min-w-[720px] border border-outline">
                    <thead>
                    <tr>
                        {columns.map((c) => {
                            const isSorted = sortField === c.key;
                            const indicator = isSorted ? (sortDir === 'asc' ? ' ▲' : (sortDir === 'desc' ? ' ▼' : '')) : '';
                            return (
                                <th key={c.key} className="border border-outline text-left align-top p-2">
                                    <div className="flex items-center gap-2">
                                        <button
                                            className="underline-offset-2 hover:underline"
                                            onClick={() => toggleSort(c.key)}
                                            type="button"
                                        >
                                            {c.label}{indicator}
                                        </button>
                                    </div>
                                    <div className="mt-1">
                                        <input
                                            value={colFilters[c.key] ?? ''}
                                            onChange={(e) => onChangeColFilter(c.key, e.target.value)}
                                            placeholder="Filtrer…"
                                            className="w-full border border-outline/60 rounded px-2 py-1 text-sm"
                                        />
                                    </div>
                                </th>
                            );
                        })}
                        {actionsCol === 1 && (
                            <th className="border border-outline text-left align-top p-2 w-[1%] whitespace-nowrap">Actions</th>
                        )}
                    </tr>
                    </thead>
                    <tbody>
                    {loading && (
                        <tr>
                            <td className="border border-outline p-3" colSpan={columns.length + actionsCol}>Chargement…</td>
                        </tr>
                    )}
                    {!loading && items.length === 0 && (
                        <tr>
                            <td className="border border-outline p-3" colSpan={columns.length + actionsCol}>Aucun élément</td>
                        </tr>
                    )}
                    {!loading && items.map((row: any) => {
                        const acts = rowActions ? rowActions(row) ?? [] : [];
                        return (
                            <tr
                                key={row.id ?? JSON.stringify(row)}
                                className="group"
                                onDoubleClick={() => {
                                    if (acts.length > 0) {
                                        try { acts[0].onClick(row); } catch {}
                                    }
                                }}
                            >
                                {columns.map((c) => (
                                    <td className="border border-outline align-top p-2" key={c.key}>
                                        {renderCell(row, c.key, c.field, models as any)}
                                    </td>
                                ))}
                                {actionsCol === 1 && (
                                    <td className="border border-outline align-top p-2">
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {acts.map((a, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    className="px-2 py-1 border border-outline/60 rounded text-sm hover:bg-gray-50"
                                                    onClick={() => a.onClick(row)}
                                                    title={a.label}
                                                >
                                                    {a.icon ? <span className="mr-1 inline-flex items-center">{a.icon}</span> : null}
                                                    <span>{a.label}</span>
                                                </button>
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

function renderCell(row: any, key: string, field: ModelField, models: Record<string, any> | null) {
    const value = row?.[key];
    if (value == null) return '';

    // If scalar field, still special-case FK xxxId to show related preview if available
    if (isScalarField(field) || typeof value !== 'object') {
        if (typeof value === 'string' && key.endsWith('Id')) {
            const base = key.slice(0, -2);
            const relObj = row?.[base];
            const display = readableFromRelation(relObj, models, guessTargetModel(models, base));
            if (display) return <span title={String(value)}>{display}</span>;
            return <span title={String(value)}>{String(value)}</span>;
        }
        return String(value);
    }

    // Relation-like object: use preview fields from related model
    const relDisplay = readableFromRelation(value, models, String(field.type));
    const id = value?.id ?? row?.[`${key}Id`];
    if (relDisplay != null) return <span title={id ? String(id) : undefined}>{relDisplay}</span>;

    // if only id exists separately (e.g., organizationId)
    const idKey = key.endsWith('Id') ? key : `${key}Id`;
    if (row[idKey]) return <span title={String(row[idKey])}>{String(row[idKey])}</span>;

    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

function guessTargetModel(models: Record<string, any> | null, baseName: string): string | undefined {
    if (!models) return undefined;
    const candidate = baseName.charAt(0).toUpperCase() + baseName.slice(1);
    if ((models as any)[candidate]) return candidate;
    return undefined;
}

function readableFromRelation(relObj: any, models: Record<string, any> | null, targetModel?: string) {
    if (!relObj) return undefined;
    // Prefer preview fields in order
    if (models && targetModel && (models as any)[targetModel]) {
        const def: Record<string, any> = (models as any)[targetModel];
        const entries = Object.entries(def);
        const previewFields = entries
            .filter(([, f]) => (f as any)?.ui?.preview === true)
            .sort((a, b) => ((a[1] as any)?.ui?.order ?? 9999) - ((b[1] as any)?.ui?.order ?? 9999))
            .map(([k]) => k);
        for (const k of previewFields) {
            const v = relObj?.[k];
            if (v != null) return String(v);
        }
    }
    // Fallback heuristics
    const fallback = relObj?.name ?? relObj?.title ?? relObj?.email ?? relObj?.slug ?? relObj?.id;
    if (fallback != null) return String(fallback);
    return undefined;
}
