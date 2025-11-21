import React, {startTransition, useActionState, useEffect, useMemo, useRef, useState} from "react";
import {useFormik} from 'formik';
import {actions} from 'astro:actions';
import {useStore} from "@nanostores/react";
import {modelsService, modelsStore} from "@/stores/modelsStore";
// IconButton peut ne pas être présent selon la version du design system.
// S'il est disponible, on l'utilise pour l'action d'édition; sinon on garde un <button> simple.
// @ts-ignore
import {Button, Card, IconButton, Tab, Tabs, TextField} from "@udixio/ui-react";
import {faXmark} from "@fortawesome/pro-regular-svg-icons";

// ---------- Relations state (extrait au niveau module pour éviter recréations) ----------
export type RelationState = {
    // Common
    mode?: 'associate' | 'create';
    open?: boolean; // section ouverte/collapsée (pour limiter l'affichage)
    adding?: boolean; // UI d'ajout en cours (affiche Tabs + contenu)
    search: string;
    options: { id: string; label: string }[];
    loading: boolean;
    selectedLabels?: Record<string, string>; // id -> label pour affichage (ui.displayFields)
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
    depth: number; // remaining depth (-1 = unlimited)
    level: number; // 1 = top-level of the current form
};

function RelationField({rf, st, updateState, reloadOptions, depth, level}: RelationFieldProps) {
    const isList = !!rf.isList;
    const isRequired = !!rf.isRequired;
    const forceMode: 'associate' | 'create' | undefined = rf?.ui?.forceMode;
    const inlineFields: boolean = !!rf?.ui?.inlineFields;

    // Normalisation lecture: tableau courant des sélections
    const currentSelection: string[] = useMemo(() => {
        if (isList) return st?.selectedIds || [];
        const one = st?.selectedId ? [st.selectedId] : [];
        return one;
    }, [isList, st?.selectedId, st?.selectedIds]);

    // Ajout d'une sélection
    const handleSelect = (id: string) => {
        if (!id) return;
        const opt = (st?.options || []).find(o => o.id === id);
        const label = opt?.label || id;
        if (isList) {
            updateState(rf, (prev) => ({
                ...prev,
                selectedIds: Array.from(new Set([...(prev.selectedIds || []), id])),
                selectedLabels: {...(prev.selectedLabels || {}), [id]: label},
                adding: false
            }));
        } else {
            updateState(rf, (prev) => ({
                ...prev,
                mode: 'associate',
                selectedId: id,
                selectedLabels: {...(prev.selectedLabels || {}), [id]: label},
                adding: false
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

    // Initialisation ouverture/collapse pour éviter affichage infini + required auto-adding + forceMode
    useEffect(() => {
        if (!st) return;
        // Ouvrir par défaut si (required) OU (premier niveau)
        if (st.open === undefined) {
            updateState(rf, (prev) => ({...prev, open: (isRequired || level === 1)}));
        }
        // Forcer le mode si demandé par le schéma UI
        if (forceMode && st.mode !== forceMode) {
            updateState(rf, (prev) => ({...prev, mode: forceMode}));
        }
        // Si la relation est requise, démarrer directement l'ajout
        const hasSelection = isList
            ? ((st.selectedIds && st.selectedIds.length > 0) || (st.createItems && st.createItems.length > 0))
            : (!!st.selectedId || !!st.createValues);
        // Exception: si la relation fait partie d'un groupe mutex, on NE force PAS l'ajout automatique,
        // car l'utilisateur doit d'abord choisir quel champ du groupe il souhaite remplir.
        const inMutexGroup = !!rf?.ui?.mutexKey;
        if (isRequired && !hasSelection && !st.adding && !inMutexGroup) {
            updateState(rf, (prev) => ({
                ...prev,
                adding: true,
                mode: (forceMode || (level === 1 ? 'create' : 'associate'))
            }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRequired, level]);

    // Tabs contrôlés: 0 = Créer, 1 = Associer (désactivés si forceMode)
    const selectedTab = ((forceMode || st?.mode || (level === 1 ? 'create' : 'associate')) === 'create') ? 0 : 1;
    const setSelectedTab = (idx: number) => {
        if (forceMode) return; // mode imposé
        updateState(rf, (prev) => ({
            ...prev,
            mode: idx === 0 ? 'create' : 'associate',
            // Si on passe en association, on annule l'ébauche de création en cours
            ...(idx !== 0
                ? {createDraft: undefined, createValues: undefined}
                : // Si singulier et on crée, on libère la sélection courante
                (isList ? {} : {selectedId: undefined}))
        }))
    };

    // Mode inline: on rend directement les champs du sous-formulaire (création forcée, sans en-tête)
    if (inlineFields) {
        return (
            <div className="mt-2">
                <DynamicForm
                    model={rf.targetModel}
                    hideSubmit
                    mode={'create'}
                    relationsDepth={depth === -1 ? -1 : Math.max(0, (depth ?? 1) - 1)}
                    level={level + 1}
                    value={isList ? (st?.createDraft || {}) : (st?.createValues || {})}
                    onChange={(vals) => {
                        if (isList) {
                            updateState(rf, (prev) => ({
                                ...prev,
                                mode: 'create',
                                createDraft: vals,
                                adding: true,
                                open: true,
                            }));
                        } else {
                            updateState(rf, (prev) => ({
                                ...prev,
                                mode: 'create',
                                createValues: vals,
                                selectedId: undefined,
                                adding: true,
                                open: true,
                            }));
                        }
                    }}
                />
            </div>
        );
    }

    if (!st?.adding) {
        return <Button type="button" variant="tonal" onClick={() => updateState(rf, (prev) => ({
            ...prev,
            adding: true,
            mode: (forceMode || (level === 1 ? 'create' : 'associate'))
        }))}>{currentSelection.length > 0 ? 'Modifier' : 'Ajouter un ' + (rf.ui?.label ?? rf.name ?? 'unknow')}</Button>
    }

    return (
        <>

            <div className="border-l-2 border-secondary  rounded-2xl ">
                {/* Bouton d'activation pour relations optionnelles et profondes */}
                {(!isRequired && level > 1 && !st?.open) && (
                    <div className="my-2">
                        <Button type="button" variant="tonal"
                                onClick={() => updateState(rf, (prev) => ({...prev, open: true}))}>
                            {(rf.ui?.label || rf.documentation || rf.name)}
                        </Button>
                        {rf.ui?.description && (
                            <div className="text-xs text-on-surface-variant mt-1">{rf.ui.description}</div>
                        )}
                    </div>
                )}

                {(!(!isRequired && level > 1 && !st?.open)) && (
                    <Card className="bg-surface-container-high rounded-xl max-w-xl">
                        <div className="px-3 py-2  flex items-center justify-between gap-3">
                            <div className="flex-1">
                                <div
                                    className="text-title-large">{rf.ui?.label || rf.documentation || `${rf.name}`}</div>
                                {rf.ui?.description && (
                                    <div className="text-sm text-on-surface-variant">{rf.ui.description}</div>
                                )}
                            </div>
                            <div
                                className="text-xs text-gray-500">{`→ ${rf.targetModel}${isList ? ' (multiple)' : ''}`}</div>
                            <IconButton type={"button"} size={"small"} icon={faXmark} onClick={() => {
                                // Fermer la section et annuler les créations en cours
                                updateState(rf, (prev) => ({
                                    ...prev,
                                    open: false,
                                    adding: false,
                                    mode: undefined,
                                    createDraft: undefined,
                                    createValues: undefined,
                                }));
                            }}>Annuler</IconButton>
                        </div>
                    </Card>
                )}

                {(!(!isRequired && level > 1 && !st?.open)) && (
                    <div className="p-4 space-y-3">
                        {/* 1. Liste visible des associations et créations en cours */}
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap gap-2">
                                {currentSelection.map((id) => (
                                    <span key={id}
                                          className="inline-flex items-center gap-2 px-2 py-0.5 border rounded-full text-xs">
                                <span className="opacity-70">{st?.selectedLabels?.[id] || id}</span>
                                <button type="button" className="text-red-600"
                                        onClick={() => handleRemove(id)}>×</button>
                            </span>
                                ))}
                            </div>

                            {/* Pour les listes: rendre visibles les brouillons à créer */}
                            {isList && (st?.createItems && st.createItems.length > 0) && (
                                <div className="flex flex-col gap-1">
                                    {st.createItems.map((it, idx) => {
                                        const display = Array.isArray(rf?.ui?.displayFields) ? rf.ui.displayFields : undefined;
                                        const label = display && display.length > 0
                                            ? display.map((k: string) => it?.[k]).filter(Boolean).join(' · ')
                                            : (it?.name || it?.title || it?.email || it?.slug || `Nouveau ${rf.targetModel}`);
                                        return (
                                            <div key={idx}
                                                 className="flex items-center justify-between gap-2 px-2 py-1 border rounded">
                                                <div className="text-xs">
                                                    <span className="font-medium">{label}</span>
                                                    <span className="opacity-60"> — brouillon à créer</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {/* Éditer l'élément: le replacer comme ébauche et passer en mode création */}
                                                    {IconButton ? (
                                                        <IconButton
                                                            onClick={() => updateState(rf, (prev) => ({
                                                                ...prev,
                                                                adding: true, mode: 'create',
                                                                createDraft: prev.createItems?.[idx],
                                                                createItems: (prev.createItems || []).filter((_, i) => i !== idx)
                                                            }))}
                                                            label="Éditer"
                                                            variant="standard"
                                                        />
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className="text-xs underline"
                                                            onClick={() => updateState(rf, (prev) => ({
                                                                ...prev,
                                                                adding: true, mode: 'create',
                                                                createDraft: prev.createItems?.[idx],
                                                                createItems: (prev.createItems || []).filter((_, i) => i !== idx)
                                                            }))}
                                                        >Éditer</button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        className="text-xs text-red-600"
                                                        onClick={() => updateState(rf, (prev) => ({
                                                            ...prev,
                                                            createItems: (prev.createItems || []).filter((_, i) => i !== idx)
                                                        }))}
                                                    >Retirer
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* 1.b Boutons pour démarrer l'ajout */}
                        {!st?.adding && (
                            <div className="flex justify-start">
                                {isList ? (
                                    <Button type="button" variant="tonal" onClick={() => updateState(rf, (prev) => ({
                                        ...prev,
                                        mode: (level === 1 ? 'create' : 'associate')
                                    }))}>Ajouter</Button>
                                ) : (
                                    <Button type="button" variant="tonal" onClick={() => updateState(rf, (prev) => ({
                                        ...prev,
                                        mode: (level === 1 ? 'create' : 'associate')
                                    }))}>{currentSelection.length > 0 ? 'Modifier' : 'Ajouter'}</Button>
                                )}
                            </div>
                        )}

                        {/* 2. Zone d'ajout: Tabs + contenus */}
                        {st?.adding && (
                            <>
                                {!forceMode && (
                                    <Tabs variant={"secondary"} className={"bg-transparent w-fit"}
                                          selectedTab={selectedTab}
                                          setSelectedTab={setSelectedTab} scrollable>
                                        <Tab type="button" label="Créer"/>
                                        <Tab type="button" label="Associer"/>
                                    </Tabs>
                                )}

                                {/* Barre Recherche / Ajout (mode association) */}
                                {((forceMode ? forceMode !== 'create' : st?.mode !== 'create')) && !(!!(!isList && currentSelection.length > 0)) && (
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
                                            <label
                                                className="block text-xs text-gray-600">{isList ? 'Ajouter' : 'Choisir'}</label>
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

                                {/* 3. Zone de création - ne pas rendre le sous-formulaire tant que le mode n'est pas 'create' */}
                                {(forceMode ? forceMode === 'create' : st?.mode === 'create') && (
                                    <div className="pt-2">
                                        <div className="mt-2">
                                            <DynamicForm
                                                model={rf.targetModel}
                                                hideSubmit
                                                mode={'create'}
                                                relationsDepth={depth === -1 ? -1 : Math.max(0, (depth ?? 1) - 1)}
                                                level={level + 1}
                                                value={isList ? (st?.createDraft || {}) : (st?.createValues || {})}
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
                                                                createDraft: undefined,
                                                                adding: false
                                                            };
                                                        })}
                                                    >Ajouter à la liste
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Info items à créer pour listes - remplacé par la liste détaillée ci-dessus */}
                    </div>
                )}
            </div>
        </>
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
    relationsDepth?: number; // how deep relations sections should be rendered (0 = none, -1 = unlimited)
    level?: number; // current nesting level (1 = root); used for default create mode only at first level
};

export default function DynamicForm({
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
                                        relationsDepth = -1,
                                        level = 1
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
        let relsAll = list.filter(f => !!f.relationName).map(f => ({
            ...f,
            isList: !!f.isList,
            targetModel: String(f.type),
            fk: !f.isList && Array.isArray(f.relationFromFields) && f.relationFromFields.length > 0 ? f.relationFromFields[0] : undefined,
        }));
        // Ajout des relations synthétiques pour les FK orphelines (ex: userId)
        try {
            const defModels = new Set(Object.keys(defs || {}));
            for (const f of list) {
                if (f.relationName || f.isList || f.isId) continue;
                if (String(f.type) !== 'String') continue;
                const name: string = String(f.name);
                if (!name.endsWith('Id')) continue;
                const fk = name;
                if (relsAll.some(r => r.fk === fk)) continue;
                const base = name.substring(0, name.length - 2);
                if (!base) continue;
                const targetModel = base.charAt(0).toUpperCase() + base.slice(1);
                if (!defModels.has(targetModel)) continue;
                relsAll.push({
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
        // hide scalar FK fields that are handled by relation sections
        const fkNames = new Set(relsAll.filter(r => !r.isList).map(r => r.fk).filter(Boolean) as string[]);
        scalars = scalars.filter(s => !fkNames.has(s.name));
        // Apply relationsDepth: 0 => hide relations, -1 => unlimited
        if ((relationsDepth ?? 0) === 0) {
            return {scalarFields: scalars, relations: [] as any[], defs};
        }

        if (model == "Client") {
            console.log(model, {scalarFields: scalars, relations: relsAll, defs});
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
        } else if (type === 'Json'
            || type === 'DateTime'
            || isEnum
            || (type === 'Boolean')
        ) {
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
        } else {
            console.error(`Unknown field type: ${type}`);
            return null;
        }


    };

    // ---------- Relations state & helpers ----------
    const [relationUIState, setRelationUIState] = useState<Record<string, RelationState>>({});


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

            const next = updater(current);

            // Gestion de l'exclusivité (mutex) entre relations d'un même groupe
            const mutexKey = rf?.ui?.mutexKey;
            let newState: Record<string, RelationState> = {
                ...prev,
                [rf.name]: next,
            };
            const isActive = () => {
                // actif si une sélection ou une création concrète est présente
                // ou si l'utilisateur a simplement démarré un ajout (adding=true)
                if (next.adding) return true;
                if (rf.isList) {
                    if ((next.selectedIds && next.selectedIds.length > 0)) return true;
                    if ((next.createItems && next.createItems.length > 0)) return true;
                    if (next.mode === 'create' && next.createDraft && Object.keys(next.createDraft).length > 0) return true;
                    return false;
                } else {
                    if (next.selectedId) return true;
                    if (next.mode === 'create' && next.createValues && Object.keys(next.createValues).length > 0) return true;
                    return false;
                }
            };
            if (mutexKey) {
                const becameActive = isActive();
                if (becameActive) {
                    for (const other of relations) {
                        if (other.name === rf.name) continue;
                        if (other?.ui?.mutexKey && other.ui.mutexKey === mutexKey) {
                            const prevOther = newState[other.name] ?? {
                                mode: 'associate',
                                search: '',
                                options: [],
                                loading: false,
                                selectedIds: [],
                                createItems: [],
                            } as RelationState;
                            newState[other.name] = {
                                ...prevOther,
                                // on garde l'état d'ouverture mais on vide les contenus
                                selectedId: undefined,
                                selectedIds: [],
                                selectedLabels: prevOther.selectedLabels, // labels conservés, sans impact
                                createValues: undefined,
                                createDraft: undefined,
                                createItems: [],
                                // sortir du mode ajout si actif
                                adding: false,
                                // mode non imposé laissé tel quel
                            };
                        }
                    }
                }
            }
            return newState;
        });
    };

    const reloadRelationOptions = (rf: any, q: string) => {
        updateRelationState(rf, (st) => ({...st, loading: true, search: q}));
        startTransition(async () => {
            try {
                const resp = await listEntitiesAction({model: rf.targetModel, q, limit: 25} as any);
                const payload = (resp as any)?.data || (listEntitiesRes as any)?.data;
                const display = Array.isArray(rf?.ui?.displayFields) ? rf.ui.displayFields : undefined;
                const options = ((payload?.items) || []).map((it: any) => {
                    let label: string = '';
                    if (display && display.length > 0) {
                        label = display.map((k: string) => it?.[k]).filter(Boolean).join(' · ');
                    }
                    if (!label) label = it.name || it.title || it.email || it.slug || it.id;
                    return {id: it.id, label};
                });
                updateRelationState(rf, (st) => ({...st, options, loading: false}));
            } catch {
                updateRelationState(rf, (st) => ({...st, loading: false}));
            }
        });
    };


    return (
        <form ref={formRef} className={"max-w-screen-xl " + className} onSubmit={formik.handleSubmit}>
            {/* Scalars */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {scalarFields.map((f: any) => (
                    <div key={f.name} className={(f.type === 'Json' ? 'md:col-span-2' : '') + ''}>

                        {renderField(f)}

                    </div>
                ))}
            </div>

            {/* Relations */}
            {(relationsDepth !== 0 && (relations.length > 0)) && (() => {
                // Grouper visuellement les relations qui partagent un mutexKey
                type R = any;
                const groups: { key: string; items: R[] }[] = [];
                const order: string[] = [];
                const map: Record<string, R[]> = {};
                for (const rf of relations) {
                    const key = rf?.ui?.mutexKey ? `mutex:${rf.ui.mutexKey}` : `single:${rf.name}`;
                    if (!map[key]) {
                        map[key] = [];
                        order.push(key);
                    }
                    map[key].push(rf);
                }
                for (const k of order) groups.push({key: k, items: map[k]});

                return (
                    <div className="mt-6 space-y-6">
                        {groups.map(group => {
                            const isMutexGroup = group.key.startsWith('mutex:') && group.items.length > 1;
                            if (isMutexGroup) {
                                return (
                                    <div key={group.key} className="flex flex-wrap gap-3 items-start">
                                        {group.items.map((rf: any) => (
                                            <div key={rf.name} className="">
                                                <RelationField
                                                    rf={rf}
                                                    st={relationUIState[rf.name]}
                                                    updateState={updateRelationState}
                                                    reloadOptions={reloadRelationOptions}
                                                    depth={relationsDepth}
                                                    level={level}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                );
                            }
                            // Default rendering for single relations or groups of size 1
                            return group.items.map((rf: any) => (
                                <RelationField
                                    key={rf.name}
                                    rf={rf}
                                    st={relationUIState[rf.name]}
                                    updateState={updateRelationState}
                                    reloadOptions={reloadRelationOptions}
                                    depth={relationsDepth}
                                    level={level}
                                />
                            ));
                        })}
                    </div>
                );
            })()}

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
