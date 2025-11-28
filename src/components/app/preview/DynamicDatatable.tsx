import React, {useEffect, useMemo, useState} from 'react';
// Global search bar removed per new requirements
import useDynamicList from './useDynamicList.ts';
import {useStore} from "@nanostores/react";
import {modelsService, modelsStore} from '@/stores/modelsStore.ts';
import {Card, IconButton,} from "@udixio/ui-react";
import {FieldRenderer} from "@components/app/form/FieldRenderer.tsx";
import {actions} from 'astro:actions';
import {getModelRelations, resolveEntityPreview} from '@/utils/modelUtils.ts';
import DynamicPresets from './DynamicPresets.tsx';
import type {IconDefinition} from "@fortawesome/pro-light-svg-icons";
import {ToolTip} from "@components/ToolTip.tsx";

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
type ColumnDef = ColumnDefField | ColumnDefMutex;

export default function DynamicDatatable({model, presets, pageSize = 25, rowActions}: Props) {
    const list = useDynamicList<any>(model, {limit: pageSize});
    const {models} = useStore(modelsStore);
    const [colFilters, setColFilters] = useState<Record<string, string>>({});
    const [presetFilter, setPresetFilter] = useState<Record<string, any> | undefined>(undefined);
    const [sortField, setSortField] = useState<string | undefined>(undefined);
    const [sortDir, setSortDir] = useState<'asc' | 'desc' | undefined>(undefined);

    // Compute columns early so effects can safely depend on it
    const columns = useMemo<ColumnDef[]>(() => {
        const defs: any = (models as any)?.[model];
        if (!defs) return [];

        const fieldsRec: ModelDefinition = defs as any;
        const modelUi: any = defs.ui || {};
        const entries = Object.entries(fieldsRec).filter(([name]) => name !== 'ui');
        if (entries.length === 0) return [];

        // Identify preview mode
        const hasPreview = entries.some(([, f]) => (f as ModelField).ui?.preview === true);

        // Group by mutexKey for relation-like fields
        const groups = new Map<string, { members: Array<[string, ModelField]>; order: number; label?: string }>();
        for (const [name, fAny] of entries) {
            const f = fAny as ModelField;
            const mutexKey = f.ui?.mutexKey;
            const isRelationLike = !!f.relationName || !isScalarField(f);
            if (mutexKey && isRelationLike) {
                if (!groups.has(mutexKey)) {
                    const cfg = modelUi?.mutexGroups?.[mutexKey] || {};
                    groups.set(mutexKey, {
                        members: [],
                        order: Number.isFinite(cfg.order) ? cfg.order : (f.ui?.order ?? 9999),
                        label: cfg.label,
                    });
                }
                const g = groups.get(mutexKey)!;
                g.members.push([name, f]);
                // order = min of members' ui.order
                const memberOrder = f.ui?.order ?? 9999;
                if (memberOrder < g.order) g.order = memberOrder;
            }
        }

        // Prepare normal fields excluding mutex members
        const mutexMemberNames = new Set<string>();
        for (const g of groups.values()) {
            for (const [n] of g.members) mutexMemberNames.add(n);
        }

        let chosenFieldEntries = entries.filter(([name, fAny]) => {
            if (mutexMemberNames.has(name)) return false; // absorbed by mutex column
            const f = fAny as ModelField;
            if (hasPreview) return f.ui?.preview === true || f.isId;
            return f.isId || isScalarField(f);
        });

        // id fallback
        const idFields = entries.filter(([, f]) => (f as ModelField).isId);
        if (!chosenFieldEntries.some(([, f]) => (f as ModelField).isId) && idFields.length > 0) {
            chosenFieldEntries = [idFields[0], ...chosenFieldEntries];
        }

        // Build field columns
        const fieldCols: ColumnDefField[] = chosenFieldEntries
            .map(([key, fAny]) => {
                const f = fAny as ModelField;
                return {
                    key,
                    label: f.ui?.label ?? key,
                    kind: 'field',
                    field: f,
                    order: f.ui?.order ?? 9999,
                };
            });

        // Build mutex columns: include if any member has preview in preview mode OR group config preview OR not in preview mode but at least one member would've been non-scalar (usually hidden unless preview)
        const mutexCols: ColumnDefMutex[] = [];
        for (const [mKey, g] of groups.entries()) {
            const cfg = modelUi?.mutexGroups?.[mKey] || {};
            const anyMemberPreview = g.members.some(([, f]) => f.ui?.preview === true);
            const include = hasPreview ? (cfg.preview === true || anyMemberPreview) : true; // in non-preview mode, allow showing group
            if (!include) continue;
            const label = cfg.label || g.label || mKey;
            const membersSorted = g.members
                .sort((a, b) => ((a[1].ui?.order ?? 9999) - (b[1].ui?.order ?? 9999)))
                .map(([n]) => n);
            mutexCols.push({
                key: `__mutex__:${mKey}`,
                label,
                kind: 'mutex',
                members: membersSorted,
                order: g.order ?? 9999,
                mutexKey: mKey
            });
        }

        // Merge and sort
        let all: ColumnDef[] = [...fieldCols, ...mutexCols];
        all.sort((a, b) => (a.order - b.order) || a.label.localeCompare(b.label));

        // Force the ID column to be first if present among chosen columns
        const idIdx = all.findIndex(c => c.kind === 'field' && (c as ColumnDefField).field.isId);
        if (idIdx > 0) {
            const [idCol] = all.splice(idIdx, 1);
            all = [idCol, ...all];
        }
        return all;
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
        const col = columns.find(c => c.key === fieldKey);
        if (col && col.kind === 'mutex') return; // disabled on mutex column
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
                return {[key]: {equals: b}};
            }

            // String => contains insensible à la casse
            if (type === 'String') {
                return {[key]: {contains: val, mode: 'insensitive'}};
            }

            // Si le type correspond à un autre modèle, on évite (le filtrage relationnel n'est pas géré ici)
            if (modelNames.has(type)) {
                // fallback: essaie sur la FK conventionnelle `${key}Id`
                const fk = `${key}Id`;
                if (defs?.[fk]?.type === 'String') {
                    return {[fk]: {contains: val, mode: 'insensitive'}};
                }
                return undefined as any;
            }

            // Enum ou autres scalaires (Int, Decimal, DateTime, etc.) => equals
            // Tentative de coercition pour les numériques
            if (type === 'Int' || type === 'BigInt' || type === 'Float' || type === 'Decimal') {
                const n = Number(val);
                if (!Number.isNaN(n)) return {[key]: {equals: n}};
                return undefined as any;
            }
            // DateTime/Date: laissez equals string (Prisma tentera de parser si ISO)
            return {[key]: {equals: val}};
        }).filter(Boolean);

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
    }, [colFilters, models, model, presetFilter]);

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
            <Card variant={"filled"} className="overflow-auto">
                <table className="min-w-[720px] border border-outline">
                    <thead>
                    <tr>
                        {columns.map((c) => {
                            const isSorted = sortField === c.key;
                            const indicator = isSorted ? (sortDir === 'asc' ? ' ▲' : (sortDir === 'desc' ? ' ▼' : '')) : '';
                            if (c.kind === 'mutex') {
                                return (
                                    <th key={c.key} className="border border-outline text-left align-top p-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-800">{c.label}</span>
                                        </div>
                                        {/* Tri/filtre désactivés pour la colonne mutex */}
                                    </th>
                                );
                            }
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
                        return (
                            <tr
                                key={row.id ?? JSON.stringify(row)}
                                className="group"
                                onDoubleClick={() => {
                                    if (acts.length > 0) {
                                        try {
                                            acts[0].onClick(row);
                                        } catch {
                                        }
                                    }
                                }}
                            >
                                {columns.map((c) => (
                                    <td className="border border-outline align-top p-2" key={c.key}>
                                        {c.kind === 'mutex'
                                            ? renderMutexCell(row, c as ColumnDefMutex, models as any, model)
                                            : (isEditableField((c as ColumnDefField).field)
                                                ? <EditableCell
                                                    row={row}
                                                    model={model}
                                                    fieldKey={c.key}
                                                    field={(c as ColumnDefField).field}
                                                    models={models as any}
                                                    onSaved={() => list.reload()}
                                                />
                                                : renderCell(row, c.key, (c as ColumnDefField).field, models as any, model))}
                                    </td>
                                ))}
                                {actionsCol === 1 && (
                                    <td className="border border-outline align-top p-2">
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

function renderCell(
    row: any,
    key: string,
    field: ModelField,
    models: Record<string, any> | null,
    parentModelName: string,
) {
    const value = row?.[key];
    if (value == null) return '';

    // If scalar field, still special-case FK xxxId to show related preview if available
    if (isScalarField(field) || typeof value !== 'object') {
        if (typeof value === 'string' && key.endsWith('Id')) {
            const base = key.slice(0, -2);
            const relObj = row?.[base];
            let target: string | undefined;
            const parentDef: any = models ? (models as any)[parentModelName] : undefined;
            const baseMeta: any = parentDef ? parentDef[base] : undefined;
            if (baseMeta && typeof baseMeta.type === 'string') target = String(baseMeta.type);
            if (!target) target = guessTargetModel(models, base);
            const display = resolveEntityPreview(relObj, target, models as any);
            if (display) {
                return (
                    <ToolTip content={
                        <pre className="text-xs overflow-auto max-w-[360px] max-h-[240px]">{safeStringify(relObj)}</pre>
                    }>
                        <span className="underline decoration-dotted cursor-help">{display}</span>
                    </ToolTip>
                );
            }
            return String(value);
        }
        return String(value);
    }

    // Relation-like object: use preview fields from related model
    const relDisplay = resolveEntityPreview(value, String(field.type), models as any);
    if (relDisplay != null) {
        return (
            <ToolTip content={
                <pre className="text-xs overflow-auto max-w-[360px] max-h-[240px]">{safeStringify(value)}</pre>
            }>
                <span className="underline decoration-dotted cursor-help">{relDisplay}</span>
            </ToolTip>
        );
    }

    // if only id exists separately (e.g., organizationId)
    const idKey = key.endsWith('Id') ? key : `${key}Id`;
    if (row[idKey]) return String(row[idKey]);

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

// Rendu d'une colonne mutex: affiche la première relation non nulle parmi les membres
function renderMutexCell(
    row: any,
    col: { members: string[]; mutexKey: string; label: string },
    models: Record<string, any> | null,
    parentModelName: string,
) {
    const parentDef: any = models ? (models as any)[parentModelName] : undefined;
    for (const member of col.members) {
        const relObj = row?.[member];
        const idVal = row?.[`${member}Id`];
        if (relObj != null) {
            let targetModel: string | undefined;
            const memberMeta: any = parentDef ? parentDef[member] : undefined;
            if (memberMeta && typeof memberMeta.type === 'string') targetModel = String(memberMeta.type);
            if (!targetModel) targetModel = guessTargetModel(models, member);
            const display = resolveEntityPreview(relObj, targetModel ?? String(relObj?.__typename ?? ''), models as any);
            if (display != null) {
                return (
                    <ToolTip content={
                        <pre className="text-xs overflow-auto max-w-[360px] max-h-[240px]">{safeStringify(relObj)}</pre>
                    }>
                        <span className="underline decoration-dotted cursor-help">{display}</span>
                    </ToolTip>
                );
            }
            if (idVal != null) {
                return String(idVal);
            }
            try {
                return JSON.stringify(relObj);
            } catch {
                return String(relObj);
            }
        }
        if (idVal != null) {
            // No included relation object but we have the FK
            return String(idVal);
        }
    }
    return <span className="text-gray-500">—</span>;
}

// ===== Inline editable cell =====
function isEditableField(field: ModelField) {
    if (!isScalarField(field)) return false;
    if (field.isId) return false;
    return true; // allow String, numbers, Boolean, Enum, DateTime, Json handled upstream if needed
}

function EditableCell({
                          row,
                          model,
                          fieldKey,
                          field,
                          models,
                          onSaved,
                      }: {
    row: any;
    model: string;
    fieldKey: string;
    field: ModelField;
    models: Record<string, any> | null;
    onSaved: () => void;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [val, setVal] = useState<any>(row?.[fieldKey]);

    useEffect(() => {
        setVal(row?.[fieldKey]);
    }, [row?.id, fieldKey]);

    async function save() {
        try {
            const payload: any = {};
            payload[fieldKey] = coerceValue(val, field.type as any);
            const {actions} = await import('astro:actions');
            await actions.updateEntity({
                model: model as any,
                id: String(row.id),
                dataJson: JSON.stringify(payload),
            });
            setIsEditing(false);
            onSaved();
        } catch (e) {
            console.error(e);
            setIsEditing(false);
        }
    }

    if (!isEditing) {
        return (
            <div onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
            }} className="min-h-[20px]">{String(row?.[fieldKey] ?? '')}</div>
        );
    }

    // Mini Formik-like adapter
    const metaWithName: any = {...field, name: fieldKey};
    const defs = models as any;
    const formik = {
        values: {[fieldKey]: val},
        setFieldValue: (name: string, v: any) => setVal(v?.target ? (eIsCheckbox(v) ? v.target.checked : v.target.value) : v),
        handleChange: (e: any) => setVal(e?.target?.type === 'checkbox' ? e.target.checked : e.target.value),
        handleBlur: async () => {
            await save();
        },
        touched: {},
        errors: {},
    };

    return (
        <div onKeyDown={async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                await save();
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                setIsEditing(false);
                setVal(row?.[fieldKey]);
            }
        }} onDoubleClick={(e) => e.stopPropagation()}>
            {/* @ts-ignore reuse FieldRenderer */}
            <FieldRenderer meta={metaWithName} formik={formik} defs={defs}/>
        </div>
    );
}

function coerceValue(v: any, type: string) {
    if (v == null) return v;
    switch (type) {
        case 'Int':
        case 'BigInt':
            return parseInt(String(v), 10);
        case 'Float':
        case 'Decimal':
            return Number(v);
        case 'Boolean':
            if (typeof v === 'boolean') return v;
            return ['true', '1', 'yes', 'on'].includes(String(v).toLowerCase());
        default:
            return v;
    }
}

function safeStringify(obj: any) {
    try {
        return JSON.stringify(obj, null, 2);
    } catch {
        return String(obj);
    }
}

function eIsCheckbox(e: any) {
    try {
        return e?.target?.type === 'checkbox';
    } catch {
        return false;
    }
}
