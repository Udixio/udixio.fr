import React, {startTransition, useActionState, useEffect, useMemo, useRef, useReducer, useState} from "react";
import {useFormik} from 'formik';
import {actions} from 'astro:actions';
import {useStore} from "@nanostores/react";
import {modelsService, modelsStore} from "@/stores/modelsStore";
// IconButton peut ne pas être présent selon la version du design system.
// S'il est disponible, on l'utilise pour l'action d'édition; sinon on garde un <button> simple.
// @ts-ignore
import {Button, Card, classnames, Divider, IconButton, Tab, Tabs, TextField} from "@udixio/ui-react";
import {faXmark} from "@fortawesome/pro-regular-svg-icons";
import {faPencil, faTrash} from "@fortawesome/pro-light-svg-icons";
import {useModelDefinition, getPreviewKeysFromDefs, makePreviewLabelFromDefs} from "./hooks/useModelDefinition";
import {computeDefaultValues} from "./utils/defaults";
import {buildRelationPayload, normalizeScalarValues} from "./utils/normalize";

// ---------- Relations state (extrait au niveau module pour éviter recréations) ----------
export type RelationState = {
    // Common
    mode?: 'associate' | 'create';
    open?: boolean; // section ouverte/collapsée (pour limiter l'affichage)
    adding?: boolean; // UI d'ajout en cours (affiche Tabs + contenu)
    search: string;
    options: { id: string; label: string; data?: any }[];
    loading: boolean;
    selectedLabels?: Record<string, string>; // id -> label pour affichage (ui.displayFields)
    selectedItems?: Record<string, any>; // id -> full item (for preview rows)
    // Singular
    selectedId?: string;
    createValues?: Record<string, any>;
    // List
    selectedIds?: string[];
    createDraft?: Record<string, any>;
    createItems?: Record<string, any>[];
};

// Reducer for relation UI state
type RelationMap = Record<string, RelationState>;
type UpdateFn = (prev: RelationState) => RelationState;
type RelationAction =
    | { type: 'UPDATE'; relation: any; updater: UpdateFn; relations: any[] }
    | { type: 'RESET_ALL' };

function relationReducer(state: RelationMap, action: RelationAction): RelationMap {
    switch (action.type) {
        case 'RESET_ALL':
            return {};
        case 'UPDATE': {
            const rf = action.relation;
            const prev = state[rf.name] ?? {
                mode: 'associate',
                search: '',
                options: [],
                loading: false,
                selectedIds: [],
                createItems: [],
                selectedItems: {},
            } as RelationState;
            const next = action.updater(prev);
            let newState: RelationMap = { ...state, [rf.name]: next };
            // Mutex cleanup if active
            const mutexKey = rf?.ui?.mutexKey;
            const isActive = () => {
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
            if (mutexKey && isActive()) {
                for (const other of action.relations) {
                    if (other.name === rf.name) continue;
                    if (other?.ui?.mutexKey && other.ui.mutexKey === mutexKey) {
                        const prevOther = newState[other.name] ?? {
                            mode: 'associate', search: '', options: [], loading: false, selectedIds: [], createItems: [], selectedItems: {}
                        } as RelationState;
                        newState[other.name] = {
                            ...prevOther,
                            selectedId: undefined,
                            selectedIds: [],
                            selectedLabels: prevOther.selectedLabels,
                            createValues: undefined,
                            createDraft: undefined,
                            createItems: [],
                            selectedItems: {},
                            adding: false,
                        };
                    }
                }
            }
            return newState;
        }
        default:
            return state;
    }
}

// ---------- Composant extrait: RelationField (évite recréation à chaque rendu) ----------
type RelationFieldProps = {
    rf: any;
    st?: RelationState;
    updateState: (rf: any, updater: (prev: RelationState) => RelationState) => void;
    reloadOptions: (rf: any, q: string) => void;
    depth: number; // remaining depth (-1 = unlimited)
    level: number; // 1 = top-level of the current form
    // When compact=true, only render the adding UI (tabs + content) without headers/card/add button.
    // Used for mutex button rows where the header is handled at group level.
    compact?: boolean;
    // Ancestors chain to hide back-relations to parent models
    ancestors: string[];
    // Current parent model name
    parentModel: string;
    // Get preview keys (fields) for a given target model
    previewKeys: (targetModel: string) => string[];
};

function RelationField({
                           rf,
                           st,
                           updateState,
                           reloadOptions,
                           depth,
                           level,
                           compact = false,
                           ancestors,
                           parentModel,
                           previewKeys
                       }: RelationFieldProps) {
    const isList = !!rf.isList;
    const isRequired = (!!rf.isRequired && !isList) || (rf.ui.required);
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
                selectedItems: {...(prev.selectedItems || {}), [id]: (opt as any)?.data},
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
                selectedIds: (prev.selectedIds || []).filter((x) => x !== id),
                selectedItems: (() => {
                    const obj = {...(prev.selectedItems || {})};
                    delete obj[id];
                    return obj;
                })(),
                selectedLabels: (() => {
                    const obj = {...(prev.selectedLabels || {})};
                    delete obj[id];
                    return obj;
                })(),
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
                    ancestors={[...ancestors, parentModel]}
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

    // Détection d'un contenu déjà présent (sélection ou brouillons pour listes)
    const hasAnyContent = useMemo(() => {
        if (!st) return false;
        if (isList) {

            const hasSel = (st.selectedIds && st.selectedIds.length > 0);
            const hasCreates = (st.createItems && st.createItems.length > 0);
            console.log('hasAnyContent', rf.ui?.label ?? rf.name ?? 'unknow', hasSel, hasCreates);

            return !!(hasSel || hasCreates);
        }
        return !!st.selectedId;
    }, [st?.selectedId, st?.selectedIds, st?.createItems, isList]);

    if (!st?.adding) {
        // Si aucun contenu pour une relation optionnelle → afficher seulement le bouton "Ajouter".
        // Sinon, rendre la carte avec la liste (sans zone d'ajout) afin de ne pas cacher l'existant.
        if (!isRequired && !hasAnyContent) {
            return <Button type="button" variant="tonal" onClick={() => updateState(rf, (prev) => ({
                ...prev,
                adding: true,
                open: true,
                mode: (forceMode || (level === 1 ? 'create' : 'associate'))
            }))}>Ajouter un {rf.ui?.label ?? rf.name ?? 'unknow'}</Button>
        }
    }


    return (
        <>

            <Card variant={"filled"} className={classnames({
                " border-0  border-l-2 border-secondary ": !compact
            })}>
                <div className="border border-outline rounded-xl overflow-hidden">
                    {/* Afficher l'en-tête si la section est ouverte OU si du contenu existe (même si normalement repliée) */}
                    {(!(!isRequired && level > 1 && !st?.open) || hasAnyContent) && !compact && (
                        <div className=" rounded-xl">
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
                                        createItems: [],
                                    }));
                                }}>Annuler</IconButton>
                            </div>
                        </div>
                    )}

                    {/* Même logique: rendre le contenu si ouvert OU si du contenu existe */}
                    {(!(!isRequired && level > 1 && !st?.open) || hasAnyContent) && (
                        <div
                            className={classnames('')}>
                            {/* 1. Liste visible des associations et créations en cours */}
                            {hasAnyContent &&
                                <div className="flex flex-col gap-2 my-2">
                                    <div className="flex flex-col gap-1">
                                        {isList ? (
                                            currentSelection.map((id) => {
                                                const keys = previewKeys(rf.targetModel);
                                                const data = st?.selectedItems?.[id];
                                                return (
                                                    <div key={id}
                                                         className="flex items-center justify-between gap-2 px-2 py-1 border rounded text-xs">
                                                        <div className="flex-1">
                                                            {keys && keys.length > 0 ? (
                                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                                    {keys.map((k) => (
                                                                        <div key={k} className="truncate">
                                                                            {data && data[k] !== undefined && data[k] !== null && data[k] !== ''
                                                                                ? String(data[k])
                                                                                : <span className="opacity-50">—</span>}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div
                                                                    className="opacity-80">{st?.selectedLabels?.[id] || id}</div>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">

                                                            <IconButton
                                                                onClick={() => updateState(rf, (prev) => ({
                                                                    ...prev,
                                                                    adding: true,
                                                                    mode: 'associate',
                                                                    open: true,
                                                                }))}
                                                                label="Éditer"
                                                                variant="standard"
                                                            />
                                                            <IconButton
                                                                onClick={() => handleRemove(id)}
                                                                label="Supprimer"
                                                                variant="standard"
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
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
                                        )}
                                    </div>

                                    {/* Pour les listes: rendre visibles les brouillons à créer */}
                                    {isList && (st?.createItems && st.createItems.length > 0) && (
                                        <>
                                            <div className="flex flex-col gap-1 px-2">
                                                {st.createItems.map((it, idx) => {
                                                    const keys = previewKeys(rf.targetModel);
                                                    return (
                                                        <div key={idx}
                                                             className="flex items-center justify-between gap-2 px-2 py-1 border border-outline rounded">
                                                            <div className="flex-1 text-xs">
                                                                {keys && keys.length > 0 ? (
                                                                    <div
                                                                        className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                                        {keys.map((k) => {
                                                                            console.log(k, st.createItems);
                                                                            return (
                                                                                <div key={k} className="truncate">
                                                                                    {it && it[k] !== undefined && it[k] !== null && it[k] !== ''
                                                                                        ? String(it[k])
                                                                                        : <span
                                                                                            className="opacity-50">—</span>}
                                                                                </div>
                                                                            )
                                                                        })}
                                                                    </div>
                                                                ) : (
                                                                    <span
                                                                        className="opacity-80">Brouillon {rf.targetModel}</span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {/* Éditer l'élément: le replacer comme ébauche et passer en mode création */}
                                                                <IconButton
                                                                    onClick={() => updateState(rf, (prev) => ({
                                                                        ...prev,
                                                                        adding: true, mode: 'create',
                                                                        createDraft: prev.createItems?.[idx],
                                                                        createItems: (prev.createItems || []).filter((_, i) => i !== idx)
                                                                    }))}
                                                                    icon={faPencil}
                                                                    size={"xSmall"}
                                                                    label="Éditer"
                                                                    variant="standard"
                                                                />
                                                                <IconButton
                                                                    onClick={() => updateState(rf, (prev) => ({
                                                                        ...prev,
                                                                        createItems: (prev.createItems || []).filter((_, i) => i !== idx)
                                                                    }))}
                                                                    size={"xSmall"}
                                                                    icon={faTrash}
                                                                    label="Supprimer"
                                                                    variant="standard"
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {
                                                !st.adding &&
                                                <Button size={"small"} className={"w-fit ml-auto mr-2 mt-4 mb-4"}
                                                        type="button"
                                                        variant="tonal"
                                                        onClick={() => updateState(rf, (prev) => ({
                                                            ...prev,
                                                            adding: true,
                                                            open: true,
                                                            mode: (forceMode || (level === 1 ? 'create' : 'associate'))
                                                        }))}>Ajouter
                                                    un {rf.ui?.label ?? rf.name ?? 'unknow'}</Button>
                                            }

                                        </>
                                    )}
                                </div>

                            }

                            {/* 2. Zone d'ajout: Tabs + contenus */}
                            {st?.adding && (
                                <>
                                    {!forceMode && (
                                        <Tabs variant={"secondary"} className={"bg-transparent w-fit mb-0"}
                                              selectedTab={selectedTab}
                                              setSelectedTab={setSelectedTab} scrollable>
                                            <Tab type="button" label="Créer"/>
                                            <Tab type="button" label="Associer"/>
                                        </Tabs>
                                    )}
                                    <div
                                        className={"content p-4  bg-surface-container-low"}>
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

                                            <div className="mt-2">
                                                <DynamicForm
                                                    model={rf.targetModel}
                                                    hideSubmit
                                                    mode={'create'}
                                                    relationsDepth={depth === -1 ? -1 : Math.max(0, (depth ?? 1) - 1)}
                                                    level={level + 1}
                                                    ancestors={[...ancestors, parentModel]}
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
                                                    <div className="flex justify-end mt-2 gap-2">
                                                        <Button
                                                            size={"small"}
                                                            variant={"outlined"}
                                                            type="button"
                                                            onClick={() => {
                                                                updateState(rf, (prev) => {
                                                                    return {
                                                                        ...prev,
                                                                        createDraft: undefined,
                                                                        adding: false
                                                                    };
                                                                })
                                                            }}
                                                        >Annuler
                                                        </Button>
                                                        <Button
                                                            size={"small"}
                                                            variant={"tonal"}
                                                            type="button"
                                                            onClick={() => {
                                                                updateState(rf, (prev) => {
                                                                    const draft = prev.createDraft;
                                                                    if (!draft) return prev;
                                                                    const list = [...(prev.createItems || []), draft];
                                                                    return {
                                                                        ...prev,
                                                                        createItems: list,
                                                                        createDraft: undefined,
                                                                        adding: false
                                                                    };
                                                                })
                                                            }}
                                                        >Ajouter à la liste
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>

                                        )}
                                    </div>


                                </>
                            )}

                            {/* Info items à créer pour listes - remplacé par la liste détaillée ci-dessus */}
                        </div>
                    )}
                </div>

            </Card>
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
    cancelLabel?: string;
    hideSubmit?: boolean;
    mode?: 'create' | 'update';
    relationsDepth?: number; // how deep relations sections should be rendered (0 = none, -1 = unlimited)
    level?: number; // current nesting level (1 = root); used for default create mode only at first level
    onCancel?: () => void;
    // Chaîne des modèles ancêtres pour masquer les back-relations 2-way vers un parent déjà en cours d'édition
    ancestors?: string[];
};

export default function DynamicForm({
                                        model,
                                        value,
                                        onChange,
                                        onSubmit,
                                        onCancel,
                                        exclude,
                                        disabledFields,
                                        className,
                                        submitLabel = "Enregistrer",
                                        cancelLabel = "Annuler",
                                        hideSubmit,
                                        mode = 'create',
                                        relationsDepth = -1,
                                        level = 1,
                                        ancestors = []
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

    const {scalarFields, relations, relationGroups, defs, modelUI} = useModelDefinition({
        model,
        defs: $models.models as any,
        exclude,
        mode,
        relationsDepth,
        ancestors,
    });


    // Calculer des valeurs par défaut stables (éviter des deps JSON.stringify)
    const defaultValues = useMemo(() => computeDefaultValues(scalarFields, value), [scalarFields, value]);


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
            const normalized = normalizeScalarValues(vals, scalarFields);
            try {
                const withRelations = await buildRelationPayload(normalized, relations, relationUIState, createEntityAction, createEntityRes);
                await onSubmit?.(withRelations);
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

    const FieldRenderer = ({meta}: { meta: any }) => {
        const f = meta;
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
        const isEnum = defs?.[type]?.['isEnum'];

        if (type === 'String' || isNumber) {
            return <TextField variant="outlined" {...common} label={label} errorText={formik.errors}
                              placeholder={placeholder} {...(isNumber ? {type: 'number'} : {})}/>;
        }
        if (isEnum || type === 'Boolean' || type === 'DateTime' || type === 'Json') {
            common.className += "border border-outline px-2 py-1 w-full";
            return <>
                <label className="block text-sm mb-1">
                    {f.ui?.label || f.documentation || f.name}
                    {f.isRequired && <span className="text-red-500"> *</span>}
                </label>
                {isEnum && (() => {
                    const values = Array.isArray(defs?.[type]?.values) ? defs?.[type]?.values : Object.values(defs?.[type]?.values || {}).map((v: any) => v.name);
                    return <select {...common} name={name} disabled={disabled}>
                        <option value="">Sélectionner...</option>
                        {values.map((val: any) => (
                            <option key={String(val)} value={String(val)}>{String(val)}</option>
                        ))}
                    </select>
                })()}
                {type === 'Boolean' && (
                    <div className="flex items-center gap-2">
                        <input type="checkbox" name={name} checked={!!(formik.values as any)[name]}
                               onChange={(e) => formik.setFieldValue(name, e.target.checked)} disabled={disabled}/>
                        <span className="text-sm">{f.ui?.label || name}</span>
                    </div>
                )}
                {type === 'DateTime' && <input {...common} type="datetime-local"/>}
                {type === 'Json' && (
                    <textarea className="border w-full px-2 py-1 h-20" name={name}
                              value={(formik.values as any)[name] ?? ''}
                              onChange={(e) => formik.setFieldValue(name, e.target.value)}/>
                )}
                {formik.touched[f.name] && (formik.errors as any)[f.name] && (
                    <div className="text-xs text-red-600 mt-1">{String((formik.errors as any)[f.name])}</div>
                )}
            </>;
        }
        console.error(`Unknown field type: ${type}`);
        return null;
    };

    // ---------- Relations state & helpers ----------
    const [relationUIState, dispatch] = useReducer(relationReducer, {} as Record<string, RelationState>);


    const updateRelationState = (rf: any, updater: (prev: RelationState) => RelationState) => {
        dispatch({ type: 'UPDATE', relation: rf, updater, relations });
    };

    // Helper: build preview field list for a given target model from defs using ui.preview === true
    const getPreviewKeys = (targetModel: string): string[] => getPreviewKeysFromDefs(defs as any, targetModel);
    const makePreviewLabel = (targetModel: string, it: any): string => makePreviewLabelFromDefs(defs as any, targetModel, it);

    const reloadRelationOptions = (rf: any, q: string) => {
        updateRelationState(rf, (st) => ({...st, loading: true, search: q}));
        startTransition(async () => {
            try {
                const resp = await listEntitiesAction({model: rf.targetModel, q, limit: 25} as any);
                const payload = (resp as any)?.data || (listEntitiesRes as any)?.data;
                const options = ((payload?.items) || []).map((it: any) => {
                    // Pour les relations listes, utiliser les champs marqués ui.preview au niveau du modèle cible
                    const label = rf?.isList
                        ? makePreviewLabel(rf.targetModel, it)
                        : (() => {
                            // fallback historique pour les singuliers (affichage de recherche)
                            const display = Array.isArray(rf?.ui?.displayFields) ? rf.ui.displayFields : undefined;
                            let l = '';
                            if (display && display.length > 0) l = display.map((k: string) => it?.[k]).filter(Boolean).join(' · ');
                            if (!l) l = it.name || it.title || it.email || it.slug || it.id;
                            return l;
                        })();
                    return {id: it.id, label, data: it};
                });
                updateRelationState(rf, (st) => ({...st, options, loading: false}));
            } catch {
                updateRelationState(rf, (st) => ({...st, loading: false}));
            }
        });
    };


    // relationGroups now provided by useModelDefinition

    // Helper to check if a relation has active state
    const isStateActive = (rf: any, st?: RelationState) => {
        if (!st) return false;
        if (st.adding) return true;
        if (rf.isList) {
            if (st.selectedIds && st.selectedIds.length > 0) return true;
            if (st.createItems && st.createItems.length > 0) return true;
            if (st.mode === 'create' && st.createDraft && Object.keys(st.createDraft).length > 0) return true;
            return false;
        } else {
            if (st.selectedId) return true;
            if (st.mode === 'create' && st.createValues && Object.keys(st.createValues).length > 0) return true;
            return false;
        }
    };

    // Auto-activate first item in mutex groups when none is active
    useEffect(() => {
        for (const g of relationGroups) {
            const isMutexGroup = g.key.startsWith('mutex:') && g.items.length > 1;
            if (!isMutexGroup) continue;
            const anyActive = g.items.some((rf: any) => isStateActive(rf, relationUIState[rf.name]));
            if (anyActive) continue;
            const first = g.items[0];
            if (!first) continue;
            updateRelationState(first, (prev) => ({
                ...prev,
                adding: true,
                open: true,
                mode: (first?.ui?.forceMode || (level === 1 ? 'create' : 'associate'))
            }));
            // only one activation per effect pass is sufficient
            break;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(relationGroups.map(g => g.items.map((it: any) => it.name))), relationUIState]);

    return (
        <form ref={formRef} className={"max-w-screen-xl space-y-4 " + className} onSubmit={formik.handleSubmit}>
            {/* Scalars */}
            {
                !!scalarFields.length && <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {scalarFields.map((f: any) => (
                        <div key={f.name} className={(f.type === 'Json' ? 'md:col-span-2' : '') + ''}>
                            <FieldRenderer meta={f} />
                        </div>
                    ))}
                </div>
            }


            {/* Relations */}
            {(relationsDepth !== 0 && (relations.length > 0)) && (
                <>
                    {relationGroups.map(group => {
                        const isMutexGroup = group.key.startsWith('mutex:') && group.items.length > 1;
                        if (isMutexGroup) {
                            const mutexKey = group.key.substring('mutex:'.length);
                            const groupInfo = (modelUI as any)?.mutexGroups?.[mutexKey];

                            const active = group.items.find((rf: any) => relationUIState[rf.name]?.adding);
                            return (
                                <div key={group.key} className="flex flex-col gap-3">
                                    <div className="space-y-4 mt-8 mb-4">
                                        <Divider/>
                                        {groupInfo && (
                                            <div className="flex flex-col">
                                                {groupInfo.label && (
                                                    <div className="text-title-medium">{groupInfo.label}</div>
                                                )}
                                                {groupInfo.description && (
                                                    <div
                                                        className="text-sm text-on-surface-variant">{groupInfo.description}</div>
                                                )}
                                            </div>
                                        )}
                                        <div className="flex flex-wrap gap-2 items-center">
                                            {group.items.map((rf: any) => {
                                                const st = relationUIState[rf.name];
                                                const activated = !!st?.adding;
                                                const btnLabel = (groupInfo?.items && groupInfo.items[rf.name]?.label)
                                                    || rf.ui?.label || rf.documentation || rf.name;
                                                return (
                                                    <Button
                                                        key={rf.name}
                                                        type="button"
                                                        variant="tonal"
                                                        label={btnLabel}
                                                        activated={activated}
                                                        onToggle={(newState: boolean) => {
                                                            if (newState) {
                                                                updateRelationState(rf, (prev) => ({
                                                                    ...prev,
                                                                    adding: true,
                                                                    open: true,
                                                                    mode: (rf?.ui?.forceMode || (level === 1 ? 'create' : 'associate'))
                                                                }));
                                                            } else {
                                                                updateRelationState(rf, (prev) => ({
                                                                    ...prev,
                                                                    adding: false
                                                                }));
                                                            }
                                                        }}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {active && (
                                        <div className="pl-0">
                                            <RelationField
                                                rf={active}
                                                st={relationUIState[active.name]}
                                                updateState={updateRelationState}
                                                reloadOptions={reloadRelationOptions}
                                                depth={relationsDepth}
                                                level={level}
                                                compact
                                                ancestors={ancestors}
                                                parentModel={model}
                                                previewKeys={getPreviewKeys}
                                            />
                                        </div>
                                    )}
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
                                ancestors={ancestors}
                                parentModel={model}
                                previewKeys={getPreviewKeys}
                            />
                        ));
                    })}
                </>
            )}

            {!hideSubmit && (
                <div className="flex items-center justify-end gap-2 mt-3">
                    {onCancel && (
                        <Button
                            type="button"
                            variant="outlined"
                            onClick={() => onCancel?.()}
                        >
                            {cancelLabel}
                        </Button>
                    )}
                    <Button type={"submit"} disabled={formik.isSubmitting}>
                        {formik.isSubmitting ? 'Envoi…' : submitLabel}
                    </Button>
                </div>
            )}
        </form>
    );
}
