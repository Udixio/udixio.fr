import React, {useActionState, useEffect, useMemo, useRef, useState, useTransition} from "react";
import {useFormik} from 'formik';
import {actions} from 'astro:actions';

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
    const [models, action, pending] = useActionState(
        actions.getModels,
        undefined, // initial likes and errors
    )

    useEffect(() => {
        action()
    }, []);


    const formRef = useRef<HTMLFormElement | null>(null);


    const [initial, setInitial] = useState<Record<string, any>>(value ?? {});
    useEffect(() => setInitial(value ?? {}), [value]);

    // Build fields & relation definitions from model metadata JSON
    const {scalarFields, relationFields, defs} = useMemo(() => {
        const defs = models?.data as Record<string, Record<string, any>> | undefined;
        if (!defs) return {scalarFields: [] as any[], relationFields: [] as any[], defs: undefined as any};
        const rec = defs[model] || {};
        let list = Object.entries(rec).map(([name, meta]) => ({name, ...(meta as any)}));
        // occasional sorting / filtering logic (can be extended by mode: create/update)
        list = list.filter(f => !(f.ui?.hidden === true) && !(exclude?.includes(f.name)));
        // separate
        let scalars = list.filter(f => !f.relationName && !f.isList && !f.isId && !(mode === 'update' && f.isReadOnly));
        // sort required first then alpha
        scalars.sort((a, b) => (Number(b.isRequired) - Number(a.isRequired)) || a.name.localeCompare(b.name));
        // relations: only non-list, keep target model and fk name from relationFromFields
        let rels = list.filter(f => !!f.relationName && !f.isList).map(f => ({
            ...f,
            targetModel: String(f.type),
            fk: Array.isArray(f.relationFromFields) && f.relationFromFields.length > 0 ? f.relationFromFields[0] : undefined,
        }));
        // hide scalar FK fields that are handled by relation sections
        const fkNames = new Set(rels.map(r => r.fk).filter(Boolean) as string[]);
        scalars = scalars.filter(s => !fkNames.has(s.name));
        // if depth 0, hide relations
        if ((relationsDepth ?? 1) <= 0) rels = [];
        return {scalarFields: scalars, relationFields: rels, defs};
    }, [models, exclude, pending, model, mode, relationsDepth]);

    // Appliquer les valeurs par défaut issues de ui.default lorsque absentes
    useEffect(() => {
        if (!scalarFields || scalarFields.length === 0) return;
        const next: Record<string, any> = {...(value ?? {})};
        for (const f of scalarFields) {
            const name = f.name as string;
            if (next[name] !== undefined && next[name] !== null) continue;
            if (f?.ui?.default === undefined) continue;
            let d = f.ui.default;
            const t = String(f.type);
            try {
                if (t === 'Boolean') {
                    next[name] = Boolean(d);
                } else if (t === 'Int' || t === 'BigInt') {
                    next[name] = d === null || d === '' || d === undefined ? undefined : Number.parseInt(String(d));
                } else if (t === 'Float' || t === 'Decimal') {
                    next[name] = d === null || d === '' || d === undefined ? undefined : Number.parseFloat(String(d));
                } else if (t === 'DateTime') {
                    // Garder une valeur string compatible avec input datetime-local si déjà au format ISO
                    // Sinon, tenter de construire un ISO
                    if (typeof d === 'string') {
                        next[name] = d;
                    } else if (d) {
                        const iso = new Date(d as any).toISOString();
                        next[name] = iso;
                    }
                } else if (t === 'Json') {
                    // Le textarea attend une string, sérialiser si objet
                    if (typeof d === 'string') {
                        next[name] = d;
                    } else {
                        next[name] = JSON.stringify(d, null, 2);
                    }
                } else {
                    // String et autres scalaires
                    next[name] = d as any;
                }
            } catch {
                next[name] = d as any;
            }
        }
        setInitial(next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(scalarFields), JSON.stringify(value)]);

    // Build Formik
    const formik = useFormik({
        enableReinitialize: true,
        initialValues: initial,
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
            // Relations handling: associate selected or create on submit then assign FK
            try {
                for (const rf of relationFields) {
                    const st = relationUIState[rf.name];
                    if (!st || !rf.fk) continue;
                    if (st.mode === 'associate' && st.selectedId) {
                        normalized[rf.fk] = st.selectedId;
                    } else if (st.mode === 'create' && st.createValues) {
                        const created = await callAction('createEntity', {
                            model: rf.targetModel,
                            dataJson: JSON.stringify(st.createValues)
                        });
                        const newId = created?.created?.id;
                        if (newId) normalized[rf.fk] = newId;
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
        const common = {
            name,
            disabled,
            className: "border px-2 py-1 w-full",
            value: (type === 'Boolean') ? undefined : (formik.values as any)[name] ?? '',
            onChange: formik.handleChange,
            onBlur: formik.handleBlur,
        } as any;
        const placeholder = f.ui?.placeholder || name;
        if (type === 'String') return <input {...common} placeholder={placeholder}/>;
        if (type === 'Int' || type === 'BigInt' || type === 'Float' || type === 'Decimal') return <input {...common}
                                                                                                         type="number"
                                                                                                         placeholder={placeholder}/>;
        if (type === 'Boolean') {
            return (
                <div className="flex items-center gap-2">
                    <input type="checkbox" name={name} checked={!!(formik.values as any)[name]}
                           onChange={(e) => formik.setFieldValue(name, e.target.checked)} disabled={disabled}/>
                    <span className="text-sm">{f.ui?.label || name}</span>
                </div>
            );
        }
        if (type === 'DateTime') return <input {...common} type="datetime-local"/>;
        if (type === 'Json') return <textarea className="border w-full px-2 py-1 h-20" name={name}
                                              value={(formik.values as any)[name] ?? ''}
                                              onChange={(e) => formik.setFieldValue(name, e.target.value)}/>;
        // default to text input
        return <input {...common} placeholder={placeholder}/>;
    };

    // ---------- Relations state & helpers ----------
    type RelationState = {
        mode: 'associate' | 'create';
        search: string;
        options: { id: string; label: string }[];
        loading: boolean;
        selectedId?: string;
        createValues?: Record<string, any>;
    };
    const [relationUIState, setRelationUIState] = useState<Record<string, RelationState>>({});
    const [isFetching, startTransition] = useTransition();

    const callAction = async (name: string, payload?: any) => {
        const res = await fetch(`/_actions/${name}/`, {
            method: 'POST',
            headers: {"content-type": "application/json"},
            body: JSON.stringify(payload ?? {})
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    }

    const ensureRelState = (rf: any) => {
        setRelationUIState((prev) => prev[rf.name] ? prev : ({
            ...prev,
            [rf.name]: {mode: 'associate', search: '', options: [], loading: false}
        }));
    }

    const reloadRelationOptions = (rf: any, q: string) => {
        setRelationUIState((prev) => ({
            ...prev,
            [rf.name]: {...(prev[rf.name] || {mode: 'associate', search: ''}), loading: true}
        }));
        startTransition(async () => {
            try {
                const data = await callAction('listEntities', {model: rf.targetModel, q, limit: 25});
                const options = (data?.items || []).map((it: any) => ({id: it.id, label: it.name || it.title || it.email || it.slug || it.id}));
                setRelationUIState((prev) => ({
                    ...prev,
                    [rf.name]: {...(prev[rf.name] || {} as any), options, loading: false}
                }));
            } catch {
                setRelationUIState((prev) => ({
                    ...prev,
                    [rf.name]: {...(prev[rf.name] || {} as any), loading: false}
                }));
            }
        });
    }


    return (
        <form ref={formRef} className={className} onSubmit={formik.handleSubmit}>
            {/* Scalars */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {scalarFields.map((f: any) => (
                    <div key={f.name} className={(f.type === 'Json' ? 'md:col-span-2' : '') + ''}>
                        <label className="block text-sm mb-1">
                            {f.ui?.label || f.documentation || f.name}
                            {f.isRequired && <span className="text-red-500"> *</span>}
                        </label>
                        {renderField(f)}
                        {formik.touched[f.name] && (formik.errors as any)[f.name] && (
                            <div className="text-xs text-red-600 mt-1">{String((formik.errors as any)[f.name])}</div>
                        )}
                    </div>
                ))}
            </div>

            {/* Relations */}
            {relationFields.length > 0 && (
                <div className="mt-6 space-y-6">
                    {relationFields.map((rf: any) => {
                        const st = relationUIState[rf.name];
                        return (
                            <div key={rf.name} className="border rounded">
                                <div className="px-3 py-2 border-b bg-gray-50 flex items-center justify-between">
                                    <div className="font-medium">{rf.ui?.label || rf.documentation || `${rf.name}`}</div>
                                    <div className="text-xs text-gray-500">{`→ ${rf.targetModel}`}</div>
                                </div>
                                <div className="p-3 space-y-3">
                                    <div className="flex items-end gap-2">
                                        <div className="flex-1">
                                            <label className="block text-xs text-gray-600">Recherche</label>
                                            <input
                                                className="border px-2 py-1 w-full"
                                                placeholder={`Rechercher ${rf.targetModel}...`}
                                                value={st?.search || ''}
                                                onChange={(e) => {
                                                    ensureRelState(rf);
                                                    const v = e.target.value;
                                                    setRelationUIState((prev) => ({
                                                        ...prev,
                                                        [rf.name]: {...(prev[rf.name] || {mode: 'associate'}), search: v}
                                                    }));
                                                    reloadRelationOptions(rf, v);
                                                }}
                                                onFocus={() => {
                                                    ensureRelState(rf);
                                                    if (!st || (st && st.options?.length === 0)) reloadRelationOptions(rf, st?.search || '');
                                                }}
                                            />
                                        </div>
                                        <div className="min-w-[260px]">
                                            <label className="block text-xs text-gray-600">Associer / Créer</label>
                                            <select
                                                className="border px-2 py-1 w-full"
                                                value={st?.mode === 'create' ? '__create__' : (st?.selectedId || '')}
                                                onChange={(e) => {
                                                    ensureRelState(rf);
                                                    const val = e.target.value;
                                                    setRelationUIState((prev) => ({
                                                        ...prev,
                                                        [rf.name]: {
                                                            ...(prev[rf.name] || {} as any),
                                                            mode: val === '__create__' ? 'create' : 'associate',
                                                            selectedId: val === '__create__' ? undefined : val
                                                        }
                                                    }));
                                                }}
                                            >
                                                <option value="">— Sélectionner —</option>
                                                <option value="__create__">➕ Créer un(e) {rf.targetModel}</option>
                                                {(st?.options || []).map((o) => (
                                                    <option key={o.id} value={o.id}>{o.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {st?.mode === 'create' && (
                                        <div className="mt-2 border rounded bg-gray-50/50 p-3">
                                            <DynamicModelForm
                                                model={rf.targetModel}
                                                hideSubmit
                                                mode={'create'}
                                                relationsDepth={Math.max(0, (relationsDepth ?? 1) - 1)}
                                                onChange={(vals) => setRelationUIState((prev) => ({
                                                    ...prev,
                                                    [rf.name]: {...(prev[rf.name] || {} as any), createValues: vals}
                                                }))}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {!hideSubmit && (
                <div className="flex items-center justify-end gap-2 mt-3">
                    <button type="submit" className="border px-3 py-1 bg-black text-white disabled:opacity-50" disabled={formik.isSubmitting}>
                        {formik.isSubmitting ? 'Envoi…' : submitLabel}
                    </button>
                </div>
            )}
        </form>
    );
}
