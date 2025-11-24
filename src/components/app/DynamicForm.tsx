import React, {startTransition, useActionState, useEffect, useMemo, useRef, useState} from "react";
import {useFormik} from 'formik';
import {actions} from 'astro:actions';
import {useStore} from "@nanostores/react";
import {modelsService, modelsStore} from "@/stores/modelsStore";
// IconButton peut ne pas être présent selon la version du design system.
// S'il est disponible, on l'utilise pour l'action d'édition; sinon on garde un <button> simple.
// @ts-ignore
import {Button, Card, classnames, Divider, IconButton, Tab, Tabs, TextField} from "@udixio/ui-react";
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
    // When compact=true, only render the adding UI (tabs + content) without headers/card/add button.
    // Used for mutex button rows where the header is handled at group level.
    compact?: boolean;
    // Ancestors chain to hide back-relations to parent models
    ancestors: string[];
    // Current parent model name
    parentModel: string;
};

function RelationField({rf, st, updateState, reloadOptions, depth, level, compact = false, ancestors, parentModel}: RelationFieldProps) {
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
            return !!(hasSel || hasCreates);
        }
        return !!st.selectedId;
    }, [st?.selectedId, st?.selectedIds, st?.createItems, isList]);

    if (!st?.adding) {
        if (compact) {
            // En mode compact (groupes mutex), si du contenu existe déjà, on affiche la liste
            // directement sous la ligne de boutons. Sinon, rien (le bouton d'ajout est géré au niveau groupe).
            if (hasAnyContent) {
                return (
                    <div className={classnames('')}>
                        <div className="flex flex-col gap-2 my-2">
                            {/* Sélections associées */}
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
                            {/* Brouillons à créer (listes) */}
                            {isList && (st?.createItems && st.createItems.length > 0) && (
                                <div className="flex flex-col gap-1">
                                    {st.createItems.map((it, idx) => {
                                        const listDisplay = Array.isArray(rf?.ui?.listDisplayFields) ? rf.ui.listDisplayFields : undefined;
                                        const display = listDisplay && listDisplay.length > 0
                                            ? listDisplay
                                            : (Array.isArray(rf?.ui?.displayFields) ? rf.ui.displayFields : undefined);
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
                    </div>
                );
            }
            return null;
        }
        // Si aucun contenu pour une relation optionnelle → afficher seulement le bouton "Ajouter".
        // Sinon, rendre la carte avec la liste (sans zone d'ajout) afin de ne pas cacher l'existant.
        if (!isRequired && !hasAnyContent) {
            return <Button type="button" variant="tonal" onClick={() => updateState(rf, (prev) => ({
                ...prev,
                adding: true,
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
                            <div className="flex flex-col gap-2 my-2">
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
                                            const listDisplay = Array.isArray(rf?.ui?.listDisplayFields) ? rf.ui.listDisplayFields : undefined;
                                            const display = listDisplay && listDisplay.length > 0
                                                ? listDisplay
                                                : (Array.isArray(rf?.ui?.displayFields) ? rf.ui.displayFields : undefined);
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
                                                    <div className="flex justify-end mt-2">
                                                        <button
                                                            type="button"
                                                            className="border px-2 py-1 text-sm"
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
                                                        </button>
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

    // Build fields & relation definitions from model metadata JSON (from store)
    const {scalarFields, relations, defs, modelUI} = useMemo(() => {
        const defs = $models.models as Record<string, Record<string, any>> | null | undefined;
        if (!defs) return {
            scalarFields: [] as any[],
            relations: [] as any[],
            defs: undefined as any,
            modelUI: undefined as any
        };
        const rec = (defs as any)[model] || {};
        // Extraire l'UI du modèle au niveau racine si présent
        const modelUI = (rec as any)?.ui;

        // Construire la liste des champs en ignorant la clé spéciale 'ui'
        // et tout champ custom dépourvu de "type" valide (évite de casser le rendu si
        // l'intégration conserve des champs additionnels non Prisma)
        let list = Object.entries(rec)
            .filter(([name]) => name !== 'ui')
            .map(([name, meta], idx) => ({__index: idx, name, ...(meta as any)}))
            .filter((f: any) => typeof f?.type === 'string' || typeof f?.relationName === 'string');
        // occasional sorting / filtering logic (can be extended by mode: create/update)
        list = list.filter(f => !(f.ui?.hidden === true) && !(exclude?.includes(f.name)));
        // separate
        let scalars = list.filter(f => !f.relationName && !f.isList && !f.isId && !(mode === 'update' && f.isReadOnly));
        // Tri des champs scalaires:
        // 1) Ceux qui ont ui.order défini en premier (asc)
        // 2) Si aucun ordre défini, respecter l'ordre original du JSON (via __index)
        scalars.sort((a: any, b: any) => {
            const ao = a?.ui?.order;
            const bo = b?.ui?.order;
            const aHas = ao !== undefined && ao !== null;
            const bHas = bo !== undefined && bo !== null;
            if (aHas && bHas) return (ao as number) - (bo as number);
            if (aHas && !bHas) return -1;
            if (!aHas && bHas) return 1;
            // aucun ordre: préserver l'ordre initial
            return (a.__index ?? 0) - (b.__index ?? 0);
        });
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
        // Exclure les back‑relations vers les modèles ancêtres (évite les boucles 2‑ways)
        try {
            const ancestorSet = new Set((ancestors || []).map(String));
            relsAll = relsAll.filter(r => !ancestorSet.has(String(r.targetModel)));
        } catch {}

        // Apply relationsDepth: 0 => hide relations, -1 => unlimited
        if ((relationsDepth ?? 0) === 0) {
            return {scalarFields: scalars, relations: [] as any[], defs, modelUI};
        }

        if (model == "Client") {
            console.log(model, {scalarFields: scalars, relations: relsAll, defs});
        }

        return {scalarFields: scalars, relations: relsAll, defs, modelUI};
    }, [$models.models, exclude, model, mode, relationsDepth, JSON.stringify(ancestors)]);


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
                const listDisplay = Array.isArray(rf?.ui?.listDisplayFields) ? rf.ui.listDisplayFields : undefined;
                const display = (listDisplay && listDisplay.length > 0 && rf?.isList)
                    ? listDisplay
                    : (Array.isArray(rf?.ui?.displayFields) ? rf.ui.displayFields : undefined);
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


    // ------- Grouping and ordering of relations (memoized) -------
    type R = any;
    const relationGroups = useMemo(() => {
        const groups: { key: string; items: R[] }[] = [];
        const orderKeys: string[] = [];
        const map: Record<string, R[]> = {};
        for (const rf of relations) {
            const key = rf?.ui?.mutexKey ? `mutex:${rf.ui.mutexKey}` : `single:${rf.name}`;
            if (!map[key]) {
                map[key] = [];
                orderKeys.push(key);
            }
            map[key].push(rf);
        }
        for (const k of orderKeys) groups.push({key: k, items: map[k]});

        // Sort items within each group by ui.order (defined first) then original JSON order (__index)
        const getOrder = (rf: any) => (rf?.ui?.order);
        for (const g of groups) {
            g.items.sort((a: any, b: any) => {
                const ao = getOrder(a);
                const bo = getOrder(b);
                const aHas = ao !== undefined && ao !== null;
                const bHas = bo !== undefined && bo !== null;
                if (aHas && bHas) return (ao as number) - (bo as number);
                if (aHas && !bHas) return -1;
                if (!aHas && bHas) return 1;
                // fallback to original order from JSON
                return (a.__index ?? 0) - (b.__index ?? 0);
            });
        }
        // Sort groups themselves by the minimum order of their items (so single relations respect ui.order)
        groups.sort((ga, gb) => {
            // Compute order buckets: defined ui.order first; otherwise use original min __index
            const aOrders = ga.items.map((it: any) => it?.ui?.order).filter((v: any) => v !== undefined && v !== null);
            const bOrders = gb.items.map((it: any) => it?.ui?.order).filter((v: any) => v !== undefined && v !== null);
            if (aOrders.length > 0 && bOrders.length > 0) {
                const mina = Math.min(...aOrders as number[]);
                const minb = Math.min(...bOrders as number[]);
                if (mina !== minb) return mina - minb;
            } else if (aOrders.length > 0) {
                return -1;
            } else if (bOrders.length > 0) {
                return 1;
            }
            // Neither group has explicit order: preserve initial appearance based on smallest __index
            const minaIdx = Math.min(...ga.items.map((it: any) => it.__index ?? 0));
            const minbIdx = Math.min(...gb.items.map((it: any) => it.__index ?? 0));
            if (minaIdx !== minbIdx) return minaIdx - minbIdx;
            // Keep mutex groups before single if still equal
            const ama = ga.key.startsWith('mutex:') ? 0 : 1;
            const amb = gb.key.startsWith('mutex:') ? 0 : 1;
            if (ama !== amb) return ama - amb;
            return 0;
        });
        return groups;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(relations.map(r => ({n: r.name, k: r?.ui?.mutexKey, o: r?.ui?.order, i: r.__index})))]);

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
                            {renderField(f)}
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
                            console.log('mutex group', mutexKey, groupInfo, modelUI);

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
                                        <div className="flex flex-wrap gap-3 items-center">
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
