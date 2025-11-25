import React, {useEffect, useMemo} from "react";
// IconButton peut ne pas être présent selon la version du design system.
// S'il est disponible, on l'utilise pour l'action d'édition; sinon on garde un <button> simple.
// @ts-ignore
import {Button, Card, classnames, Divider, IconButton, Tab, Tabs, TextField} from "@udixio/ui-react";
import {faXmark} from "@fortawesome/pro-regular-svg-icons";
import {faPencil, faPlus, faTrash} from "@fortawesome/pro-light-svg-icons";
import DynamicForm, {type RelationState} from "@components/app/form/DynamicForm.tsx";
import {motion} from "motion/react";

// --- Sous-composant privé unifié pour l'affichage des éléments (sélectionnés ou brouillons) ---
type RelationItemsListProps = {
    items: Array<{ id?: string; data: any }>;
    previewKeys: string[];
    variant: 'rows' | 'tags';
    // Callbacks optionnelles
    onEdit?: (index: number, item: { id?: string; data: any }) => void;
    onRemove?: (index: number, item: { id?: string; data: any }) => void;
    // Labels fallback (utilisé pour tags lorsqu'aucune previewKey n'est définie)
    labelsMap?: Record<string, string>;
};

function RelationItemsList({items, previewKeys, variant, onEdit, onRemove, labelsMap}: RelationItemsListProps) {
    if (variant === 'tags') {
        return (
            <div className="flex flex-wrap gap-2">
                {items.map((it, idx) => (
                    <span key={it.id || idx}
                          className="inline-flex items-center gap-2 px-2 py-0.5 border rounded-full text-xs">
                        <span className="opacity-70">{(it.id && labelsMap?.[it.id]) || it.id || '—'}</span>
                        {onRemove && (
                            <button type="button" className="text-red-600" onClick={() => onRemove(idx, it)}>×</button>
                        )}
                    </span>
                ))}
            </div>
        );
    }

    // rows
    return (
        <div className="flex flex-col gap-1">
            {items.map((it, idx) => (
                <div key={it.id || idx}
                     className="flex items-center justify-between gap-2 px-2 py-1 border rounded text-xs">
                    <div className="flex-1">
                        {Array.isArray(previewKeys) && previewKeys.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {previewKeys.map((k) => (
                                    <div key={k} className="truncate">
                                        {it.data && it.data[k] !== undefined && it.data[k] !== null && it.data[k] !== ''
                                            ? String(it.data[k])
                                            : <span className="opacity-50">—</span>}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="opacity-80">{(it.id && labelsMap?.[it.id]) || it.id || '—'}</div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {onEdit && (
                            <IconButton
                                type="button"
                                onClick={() => onEdit(idx, it)}
                                icon={faPencil}
                                size={"xSmall"}
                                label="Éditer"
                                variant="standard"
                            />
                        )}
                        {onRemove && (
                            <IconButton
                                type="button"
                                onClick={() => onRemove(idx, it)}
                                size={"xSmall"}
                                icon={faTrash}
                                label="Supprimer"
                                variant="standard"
                            />
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

type RelationSearchBarProps = {
    targetModel: string;
    isList: boolean;
    search: string;
    options: { id: string; label: string }[];
    onSearchChange: (v: string) => void;
    onSelect: (id: string) => void;
    onFocusOptions: () => void;
};

function RelationSearchBar({
                               targetModel,
                               isList,
                               search,
                               options,
                               onSearchChange,
                               onSelect,
                               onFocusOptions,
                           }: RelationSearchBarProps) {
    return (
        <div className="flex items-end gap-2">
            <div className="flex-1">
                <label className="block text-xs text-gray-600">Recherche</label>
                <input
                    className="border px-2 py-1 w-full"
                    placeholder={`Rechercher ${targetModel}...`}
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    onFocus={onFocusOptions}
                />
            </div>
            <div className="min-w-[260px]">
                <label className="block text-xs text-gray-600">{isList ? 'Ajouter' : 'Choisir'}</label>
                <select
                    className="border px-2 py-1 w-full"
                    value={''}
                    onChange={(e) => onSelect(e.target.value)}
                    onFocus={onFocusOptions}
                >
                    <option value="">— {isList ? 'Ajouter…' : 'Choisir…'} —</option>
                    {(options || []).map((o) => (
                        <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}

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

export function RelationField({
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
            return <motion.div layoutId={rf.name}
                               className={"min-h-32 flex items-center justify-center bg-surface-container-high rounded-2xl "}>
                <Button icon={faPlus} type="button" variant={"tonal"} onClick={() => updateState(rf, (prev) => ({
                    ...prev,
                    adding: true,
                    open: true,
                    mode: (forceMode || (level === 1 ? 'create' : 'associate'))
                }))}>Ajouter {isList ? "des" : "un"} {rf.ui?.label ?? rf.name ?? 'unknow'}</Button>
            </motion.div>
        }
    }


    return (
        <>

            <motion.div layoutId={rf.name} className={classnames({
                " border-0  border-l-2 border-secondary bg-surface-container-high rounded-2xl ": !compact
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
                    {(hasAnyContent || isRequired || st?.open) && (
                        <div
                            className={classnames('')}>
                            {/* 1. Liste visible des associations et créations en cours */}
                            {hasAnyContent && (
                                <div className="flex flex-col gap-2 my-2">
                                    {(() => {
                                        // Normaliser les éléments sélectionnés en items {id, data}
                                        const selectionItems = currentSelection.map((id) => ({
                                            id,
                                            data: (st?.selectedItems || {})[id]
                                        }));
                                        const variant = isList ? 'rows' as const : 'tags' as const;
                                        return (
                                            <RelationItemsList
                                                items={selectionItems}
                                                variant={variant}
                                                previewKeys={previewKeys(rf.targetModel)}
                                                labelsMap={st?.selectedLabels || {}}
                                                onEdit={isList ? () => updateState(rf, (prev) => ({
                                                    ...prev,
                                                    adding: true,
                                                    mode: 'associate',
                                                    open: true,
                                                })) : undefined}
                                                onRemove={(idx, item) => {
                                                    if (item?.id) handleRemove(item.id);
                                                }}
                                            />
                                        );
                                    })()}

                                    {/* Pour les listes: rendre visibles les brouillons à créer */}
                                    {isList && (st?.createItems && st.createItems.length > 0) && (
                                        <RelationItemsList
                                            items={(st.createItems || []).map((it: any) => ({data: it}))}
                                            variant={'rows'}
                                            previewKeys={previewKeys(rf.targetModel)}
                                            onEdit={(idx) => updateState(rf, (prev) => ({
                                                ...prev,
                                                adding: true, mode: 'create',
                                                createDraft: prev.createItems?.[idx],
                                                createItems: (prev.createItems || []).filter((_, i) => i !== idx)
                                            }))}
                                            onRemove={(idx) => updateState(rf, (prev) => ({
                                                ...prev,
                                                createItems: (prev.createItems || []).filter((_, i) => i !== idx)
                                            }))}
                                        />
                                    )}

                                    {isList && (st?.createItems?.length || 0) > 0 && !st.adding && (
                                        <Button
                                            size={"small"}
                                            className={"w-fit ml-auto mr-2 mt-4 mb-4"}
                                            type="button"
                                            variant="tonal"
                                            onClick={() => updateState(rf, (prev) => ({
                                                ...prev,
                                                adding: true,
                                                open: true,
                                                mode: (forceMode || (level === 1 ? 'create' : 'associate'))
                                            }))}
                                        >Ajouter un {rf.ui?.label ?? rf.name ?? 'unknow'}</Button>
                                    )}
                                </div>
                            )}

                            {/* 2. Zone d'ajout: Tabs + contenus */}
                            {(st?.adding || isRequired) && (
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
                                            <RelationSearchBar
                                                targetModel={rf.targetModel}
                                                isList={isList}
                                                search={st?.search || ''}
                                                options={st?.options || []}
                                                onSearchChange={(v) => {
                                                    updateState(rf, (st) => ({...st, search: v}));
                                                    reloadOptions(rf, v);
                                                }}
                                                onSelect={handleSelect}
                                                onFocusOptions={ensureOptions}
                                            />
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

            </motion.div>
        </>
    );
}