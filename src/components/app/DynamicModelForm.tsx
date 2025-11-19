import React, {useActionState, useEffect, useMemo, useRef, useState, useTransition} from "react";
import {useFormik} from 'formik';
import {actions} from 'astro:actions';
import {useStore} from "@nanostores/react";
import {modelsService, modelsStore} from "@/stores/modelsStore";
import {TextField} from "@udixio/ui-react";

// ---------- Relations state (extrait au niveau module pour éviter recréations) ----------
export type RelationState = {
    // Common
    mode?: 'associate' | 'create';
    search: string;
    options: { id: string; label: string }[];
    loading: boolean;
    // Singular
    selectedId?: string;
    createValues?: Record<string, any>;
    // List
    selectedIds?: string[];
    createDraft?: Record<string, any>;
    createItems?: Record<string, any>[];
};

// ---------- Composant extrait: RelationField (évite recréation à chaque rendu) ----------
type RelationFieldProps = {
    rf: any;
    st?: RelationState;
    updateState: (rf: any, updater: (prev: RelationState) => RelationState) => void;
    reloadOptions: (rf: any, q: string) => void;
    depth: number;
};

function RelationField({rf, st, updateState, reloadOptions, depth}: RelationFieldProps) {
    const isList = !!rf.isList;

    // Normalisation lecture: tableau courant des sélections
    const currentSelection: string[] = useMemo(() => {
        if (isList) return st?.selectedIds || [];
        const one = st?.selectedId ? [st.selectedId] : [];
        return one;
    }, [isList, st?.selectedId, st?.selectedIds]);

    // Ajout d'une sélection
    const handleSelect = (id: string) => {
        if (!id) return;
        if (isList) {
            updateState(rf, (prev) => ({
                ...prev,
                selectedIds: Array.from(new Set([...(prev.selectedIds || []), id]))
            }));
        } else {
            updateState(rf, (prev) => ({
                ...prev,
                mode: 'associate',
                selectedId: id
            }));
        }
    };

    // Retrait d'une sélection
    const handleRemove = (id: string) => {
        if (isList) {
            updateState(rf, (prev) => ({
                ...prev,
                selectedIds: (prev.selectedIds || []).filter((x) => x !== id)
            }));
        } else {
            updateState(rf, (prev) => ({
                ...prev,
                selectedId: undefined
            }));
        }
    };

    // Recherche options à l'ouverture
    const ensureOptions = () => {
        if (!st || (st && (st.options?.length || 0) === 0)) {
            reloadOptions(rf, st?.search || '');
        }
    };

    return (
        <div className="border rounded">
            <div className="px-3 py-2 border-b bg-gray-50 flex items-center justify-between">
                <div className="font-medium">{rf.ui?.label || rf.documentation || `${rf.name}`}</div>
                <div className="text-xs text-gray-500">{`→ ${rf.targetModel}${isList ? ' (multiple)' : ''}`}</div>
            </div>
            <div className="p-3 space-y-3">
                {/* 1. Sélection actuelle sous forme de tags */}
                <div className="flex flex-wrap gap-2">
                    {currentSelection.map((id) => (
                        <span key={id}
                              className="inline-flex items-center gap-2 px-2 py-0.5 border rounded-full text-xs">
                            <span className="opacity-70">{id}</span>
                            <button type="button" className="text-red-600"
                                    onClick={() => handleRemove(id)}>×</button>
                        </span>
                    ))}

                    {/* Cas Création Singulière (Feedback visuel) */}
                    {(!isList && st?.mode === 'create') && (
                        <span
                            className="inline-flex items-center gap-2 px-2 py-0.5 border border-green-300 bg-green-50 text-green-700 rounded-full text-xs">
                            <span>✨ Nouveau (en cours)</span>
                            <button
                                type="button"
                                className="text-green-700"
                                onClick={() => {
                                    // Annuler la création et revenir en mode associate
                                    updateState(rf, prev => ({...prev, mode: 'associate', createValues: undefined}));
                                }}
                            >×</button>
                        </span>
                    )}
                </div>

                {/* 2. Barre Recherche / Ajout (cachée si singulier avec déjà une sélection) */}
                {!(!!(!isList && currentSelection.length > 0)) && (
                    <div className="flex items-end gap-2">
                        <div className="flex-1">
                            <label className="block text-xs text-gray-600">Recherche</label>
                            <input
                                className="border px-2 py-1 w-full"
                                placeholder={`Rechercher ${rf.targetModel}...`}
                                value={st?.search || ''}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    updateState(rf, (st) => ({...st, search: v}));
                                    reloadOptions(rf, v);
                                }}
                                onFocus={ensureOptions}
                            />
                        </div>
                        <div className="min-w-[260px]">
                            <label className="block text-xs text-gray-600">{isList ? 'Ajouter' : 'Choisir'}</label>
                            <select
                                className="border px-2 py-1 w-full"
                                value={''}
                                onChange={(e) => handleSelect(e.target.value)}
                                onFocus={ensureOptions}
                            >
                                <option value="">— {isList ? 'Ajouter…' : 'Choisir…'} —</option>
                                {(st?.options || []).map((o) => (
                                    <option key={o.id} value={o.id}>{o.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {/* 3. Zone de création */}
                <div className="pt-2">
                    <details className="group" open={st?.mode === 'create' || undefined}>
                        <summary className="cursor-pointer select-none text-sm text-blue-700">➕ Créer
                            un(e) {rf.targetModel}</summary>
                        <div className="mt-2 border rounded bg-gray-50/50 p-3">
                            <DynamicModelForm
                                model={rf.targetModel}
                                hideSubmit
                                mode={'create'}
                                relationsDepth={Math.max(0, (depth ?? 1) - 1)}
                                onChange={(vals) => {
                                    if (isList) {
                                        updateState(rf, (prev) => ({
                                            ...prev,
                                            createDraft: vals
                                        }));
                                    } else {
                                        updateState(rf, (prev) => ({
                                            ...prev,
                                            mode: 'create',
                                            createValues: vals,
                                            selectedId: undefined
                                        }));
                                    }
                                }}
                            />

                            {isList && (
                                <div className="flex justify-end mt-2">
                                    <button
                                        type="button"
                                        className="border px-2 py-1 text-sm"
                                        onClick={() => updateState(rf, (prev) => {
                                            const draft = prev.createDraft;
                                            if (!draft) return prev;
                                            const list = [...(prev.createItems || []), draft];
                                            return {
                                                ...prev,
                                                createItems: list,
                                                createDraft: undefined
                                            };
                                        })}
                                    >Ajouter à la liste
                                    </button>
                                </div>
                            )}
                        </div>
                    </details>
                </div>

                {/* Info items à créer pour listes */}
                {isList && (st?.createItems && st.createItems.length > 0) && (
                    <div className="text-xs text-gray-600">À créer: {st.createItems.length} élément(s)</div>
                )}
            </div>
        </div>
    );
}

type Props = {
    model: string;
    value?: Record<string, any>;
    onChange?: (value: Record<string, any>) => void;
    onSubmit?: (value: Record<string, any>) => Promise<any> | any;
    // Optionally filter fields
    exclude?: string[];
    disabledFields?: string[];
    className?: string;
    submitLabel?: string;
    hideSubmit?: boolean;
    mode?: 'create' | 'update';
    relationsDepth?: number; // how deep relations sections should be rendered (0 = none)
};

export default function DynamicModelForm({
                                             model,
                                             value,
                                             onChange,
                                             onSubmit,
                                             exclude,
                                             disabledFields,
                                             className,
                                             submitLabel = "Enregistrer",
                                             hideSubmit,
                                             mode = 'create',
                                             relationsDepth = 1
                                         }: Props) {
    // Centralize models loading through Nano-store

    const $models = useStore(modelsStore);

    useEffect(() => {
        if (!$models.models) {
            modelsService.load()
        }
    }, []);


    const formRef = useRef<HTMLFormElement | null>(null);


    // Additional actions used by the dynamic relations (React 19 useActionState)
    const [listEntitiesRes, listEntitiesAction] = useActionState(actions.listEntities as any, undefined);
    const [createEntityRes, createEntityAction] = useActionState(actions.createEntity as any, undefined);

    // Les valeurs initiales du formulaire seront directement dérivées de `defaultValues`.

    // Build fields & relation definitions from model metadata JSON (from store)
    const {scalarFields, relations, defs} = useMemo(() => {
        const defs = $models.models as Record<string, Record<string, any>> | null | undefined;
        if (!defs) return {
            scalarFields: [] as any[],
            relations: [] as any[],
            defs: undefined as any
        };
        const rec = (defs as any)[model] || {};
        let list = Object.entries(rec).map(([name, meta]) => ({name, ...(meta as any)}));
        // occasional sorting / filtering logic (can be extended by mode: create/update)
        list = list.filter(f => !(f.ui?.hidden === true) && !(exclude?.includes(f.name)));
        // separate
        let scalars = list.filter(f => !f.relationName && !f.isList && !f.isId && !(mode === 'update' && f.isReadOnly));
        // sort required first then alpha
        scalars.sort((a, b) => (Number(b.isRequired) - Number(a.isRequired)) || a.name.localeCompare(b.name));
        // relations unified (singular and list)
        const relsAll = list.filter(f => !!f.relationName).map(f => ({
            ...f,
            isList: !!f.isList,
            targetModel: String(f.type),
            fk: !f.isList && Array.isArray(f.relationFromFields) && f.relationFromFields.length > 0 ? f.relationFromFields[0] : undefined,
        }));
        // hide scalar FK fields that are handled by relation sections
        const fkNames = new Set(relsAll.filter(r => !r.isList).map(r => r.fk).filter(Boolean) as string[]);
        scalars = scalars.filter(s => !fkNames.has(s.name));
        // Apply relationsDepth: when <= 0, do not expose relations
        if ((relationsDepth ?? 0) <= 0) {
            return {scalarFields: scalars, relations: [] as any[], defs};
        }
        return {scalarFields: scalars, relations: relsAll, defs};
    }, [$models.models, exclude, model, mode, relationsDepth]);


    // Calculer des valeurs par défaut stables (éviter des deps JSON.stringify)
    const defaultValues = useMemo(() => {
        const base: Record<string, any> = {...(value ?? {})};
        for (const f of scalarFields) {
            const name = f.name as string;
            if (base[name] !== undefined && base[name] !== null) continue;
            // Supporter les valeurs par défaut des enums (définies dans Prisma) et UI
            // Priorité: UI.default > Prisma default
            let d = f.ui?.default ?? f.default ?? undefined;
            const t = String(f.type);
            try {
                if (t === 'Boolean') base[name] = Boolean(d);
                else if (t === 'Int' || t === 'BigInt') base[name] = d === null || d === '' || d === undefined ? undefined : Number.parseInt(String(d));
                else if (t === 'Float' || t === 'Decimal') base[name] = d === null || d === '' || d === undefined ? undefined : Number.parseFloat(String(d));
                else if (t === 'DateTime') base[name] = typeof d === 'string' ? d : (d ? new Date(d as any).toISOString() : undefined);
                else if (t === 'Json') base[name] = typeof d === 'string' ? d : JSON.stringify(d, null, 2);
                else base[name] = d as any;
            } catch {
                base[name] = d as any;
            }
        }
        return base;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scalarFields, value]);


    // Build Formik
    const formik = useFormik({
        enableReinitialize: true,
        initialValues: defaultValues,
        validate: (vals) => {
            const errors: Record<string, any> = {};
            for (const f of scalarFields) {
                if (f.isRequired && (vals[f.name] === undefined || vals[f.name] === null || vals[f.name] === '')) {
                    errors[f.name] = 'Requis';
                }
            }
            return errors;
        },
        onSubmit: async (vals, helpers) => {
            // Normalize according to scalar types (numbers, booleans, dates, json)
            const normalized: Record<string, any> = {...vals};
            for (const f of scalarFields) {
                const name = f.name as string;
                const t = String(f.type);
                const v = normalized[name];
                if (v === '' || v === undefined) {
                    continue;
                }
                if (t === 'Int' || t === 'BigInt') normalized[name] = Number.parseInt(String(v));
                if (t === 'Float' || t === 'Decimal') normalized[name] = Number.parseFloat(String(v));
                if (t === 'Boolean') normalized[name] = Boolean(v);
                if (t === 'DateTime') {
                    // Expecting value from input type=datetime-local (no timezone) -> build ISO
                    try {
                        normalized[name] = new Date(v).toISOString();
                    } catch {
                    }
                }
                if (t === 'Json' && typeof v === 'string') {
                    try {
                        normalized[name] = JSON.parse(v);
                    } catch { /* keep as string if invalid */
                    }
                }
            }
            // Relations handling unifiée: singulier (fk) ou liste (nested connect/create)
            try {
                for (const rf of relations) {
                    const st = relationUIState[rf.name];
                    if (!st) continue;
                    if (!rf.isList) {
                        if (!rf.fk) continue;
                        if (st.mode === 'associate' && st.selectedId) {
                            normalized[rf.fk] = st.selectedId;
                        } else if (st.mode === 'create' && st.createValues) {
                            const created = await createEntityAction({
                                model: rf.targetModel,
                                dataJson: JSON.stringify(st.createValues)
                            } as any);
                            const newId = (created as any)?.data?.created?.id || (createEntityRes as any)?.data?.created?.id;
                            if (newId) normalized[rf.fk] = newId;
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
            } catch (e) {
                // noop: surface error could be handled via parent onSubmit if desired
            }
            try {
                await onSubmit?.(normalized);
                helpers.setSubmitting(false);
            } catch (e) {
                helpers.setSubmitting(false);
            }
        }
    });

    // Propagate changes externally if requested
    useEffect(() => {
        onChange?.(formik.values);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formik.values]);

    const renderField = (f: any) => {
        const name = f.name as string;
        const type = String(f.type);
        const disabled = !!disabledFields?.includes(name);
        const label = (f.ui?.label || f.documentation || f.name) + (f.isRequired ? '*' : '');
        const common = {
            name,
            disabled,
            className: "",
            value: (type === 'Boolean') ? undefined : (formik.values as any)[name] ?? '',
            onChange: formik.handleChange,
            onBlur: formik.handleBlur,
        } as any;
        const placeholder = f.ui?.placeholder || name;

        const isNumber = type === 'Int' || type === 'BigInt' || type === 'Float' || type === 'Decimal';
        const isEnum = defs[type]?.['isEnum'];

        if (type == 'String' || isNumber) {
            return <TextField variant={"outlined"} {...common} label={label} errorText={formik.errors}
                              placeholder={placeholder} {...(isNumber ? {type: 'number'} : {})}/>;
        } else {
            common.className += "border border-outline px-2 py-1 w-full";
            return <>
                <label className="block text-sm mb-1">
                    {f.ui?.label || f.documentation || f.name}
                    {f.isRequired && <span className="text-red-500"> *</span>}
                </label>
                {
                    isEnum && (() => {
                        const values = Object.values(defs[type].values).map((v: any) => v.name)
                        return <select  {...common} name={name}
                                        disabled={disabled}>
                            <option value="">Sélectionner...</option>
                            {values.map(val => (
                                <option key={val} value={val}>{val}</option>
                            ))}
                        </select>
                    })()
                }
                {type === 'Boolean' &&
                    <div className="flex items-center gap-2">
                        <input type="checkbox" name={name} checked={!!(formik.values as any)[name]}
                               onChange={(e) => formik.setFieldValue(name, e.target.checked)} disabled={disabled}/>
                        <span className="text-sm">{f.ui?.label || name}</span>
                    </div>
                }
                {type === 'DateTime' &&
                    <input {...common} type="datetime-local"/>
                }
                {type === 'Json' &&
                    <textarea className="border w-full px-2 py-1 h-20" name={name}
                              value={(formik.values as any)[name] ?? ''}
                              onChange={(e) => formik.setFieldValue(name, e.target.value)}/>
                }

                {formik.touched[f.name] && (formik.errors as any)[f.name] && (
                    <div className="text-xs text-red-600 mt-1">{String((formik.errors as any)[f.name])}</div>
                )}
            </>
        }


    };

    // ---------- Relations state & helpers ----------
    const [relationUIState, setRelationUIState] = useState<Record<string, RelationState>>({});
    const [isFetching, startTransition] = useTransition();


    const updateRelationState = (rf: any, updater: (prev: RelationState) => RelationState) => {
        setRelationUIState(prev => {
            const current: RelationState = prev[rf.name] ?? {
                mode: 'associate',
                search: '',
                options: [],
                loading: false,
                selectedIds: [],
                createItems: [],
            };
            return {
                ...prev,
                [rf.name]: updater(current),
            };
        });
    };

    const reloadRelationOptions = (rf: any, q: string) => {
        updateRelationState(rf, (st) => ({...st, loading: true, search: q}));
        startTransition(async () => {
            try {
                const resp = await listEntitiesAction({model: rf.targetModel, q, limit: 25} as any);
                const payload = (resp as any)?.data || (listEntitiesRes as any)?.data;
                const options = ((payload?.items) || []).map((it: any) => ({
                    id: it.id,
                    label: it.name || it.title || it.email || it.slug || it.id
                }));
                updateRelationState(rf, (st) => ({...st, options, loading: false}));
            } catch {
                updateRelationState(rf, (st) => ({...st, loading: false}));
            }
        });
    };


    return (
        <form ref={formRef} className={className} onSubmit={formik.handleSubmit}>
            {/* Scalars */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {scalarFields.map((f: any) => (
                    <div key={f.name} className={(f.type === 'Json' ? 'md:col-span-2' : '') + ''}>

                        {renderField(f)}

                    </div>
                ))}
            </div>

            {/* Relations */}
            {(relationsDepth > 0 && (relations.length > 0)) && (
                <div className="mt-6 space-y-6">
                    {relations.map((rf: any) => (
                        <RelationField
                            key={rf.name}
                            rf={rf}
                            st={relationUIState[rf.name]}
                            updateState={updateRelationState}
                            reloadOptions={reloadRelationOptions}
                            depth={relationsDepth}
                        />
                    ))}
                </div>
            )}

            {!hideSubmit && (
                <div className="flex items-center justify-end gap-2 mt-3">
                    <button type="submit" className="border px-3 py-1 bg-black text-white disabled:opacity-50"
                            disabled={formik.isSubmitting}>
                        {formik.isSubmitting ? 'Envoi…' : submitLabel}
                    </button>
                </div>
            )}
        </form>
    );
}
