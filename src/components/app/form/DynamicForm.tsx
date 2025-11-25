import React, {startTransition, useActionState, useEffect, useMemo, useReducer, useRef} from "react";
import {useFormik} from 'formik';
import {actions} from 'astro:actions';
import {useStore} from "@nanostores/react";
import {modelsService, modelsStore} from "@/stores/modelsStore.ts";
// IconButton peut ne pas être présent selon la version du design system.
// S'il est disponible, on l'utilise pour l'action d'édition; sinon on garde un <button> simple.
// @ts-ignore
import {Button, Card, classnames, Divider, IconButton, Snackbar, Tab, Tabs, TextField} from "@udixio/ui-react";
import {getPreviewKeysFromDefs, makePreviewLabelFromDefs, useModelDefinition} from "../hooks/useModelDefinition.ts";
import {computeDefaultValues} from "../utils/defaults.ts";
import {buildRelationPayload, normalizeScalarValues} from "../utils/normalize.ts";
import {RelationField} from "@components/app/form/RelationField.tsx";
import {FieldRenderer} from "@components/app/form/FieldRenderer.tsx";

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
            let newState: RelationMap = {...state, [rf.name]: next};
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
                            mode: 'associate',
                            search: '',
                            options: [],
                            loading: false,
                            selectedIds: [],
                            createItems: [],
                            selectedItems: {}
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
                if (f.isRequired && !f.list && (vals[f.name] === undefined || vals[f.name] === null || vals[f.name] === '')) {
                    errors[f.name] = 'Requis';
                }
            }
            // Validation des relations (au niveau UI, non liées à un champ scalaire précis)
            const globalErrs: string[] = [];
            try {
                for (const rf of relations) {
                    const required = (!!rf.isRequired && !rf.isList) || !!rf?.ui?.required;
                    console.log('validating relation', rf.name, required);
                    if (!required) continue;
                    const st = (relationUIState as any)[rf.name] as RelationState | undefined;
                    let ok = false;
                    if (rf.isList) {
                        const hasSel = !!(st?.selectedIds && st.selectedIds.length > 0);
                        const hasCreate = !!(st?.createItems && st.createItems.length > 0);
                        ok = hasSel || hasCreate;
                    } else {
                        const hasSel = !!st?.selectedId;
                        const hasCreate = !!(st?.createValues && Object.keys(st.createValues || {}).length > 0);
                        ok = hasSel || hasCreate;
                    }
                    if (!ok) {
                        const label = rf?.ui?.label || rf?.documentation || rf?.name;
                        globalErrs.push(`Le champ relation « ${label} » est requis.`);
                    }
                }
            } catch {
                // ignore
            }
            if (globalErrs.length > 0) {
                (errors as any).__global = globalErrs;
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


    // ---------- Relations state & helpers ----------
    const [relationUIState, dispatch] = useReducer(relationReducer, {} as Record<string, RelationState>);


    const updateRelationState = (rf: any, updater: (prev: RelationState) => RelationState) => {
        dispatch({type: 'UPDATE', relation: rf, updater, relations});
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

    // Revalider quand l'état des relations change (utile pour règles required côté UI)
    useEffect(() => {
        // Éviter de spammer les erreurs avant interaction; on revalide surtout après une tentative de submit
        if ((formik as any).submitCount > 0) {
            formik.validateForm();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(relationUIState)]);

    return (
        <form ref={formRef} className={"max-w-screen-xl space-y-4 " + className} onSubmit={formik.handleSubmit}>
            {/* Scalars */}
            {
                !!scalarFields.length && <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {scalarFields.map((f: any) => (
                        <div key={f.name} className={(f.type === 'Json' ? 'md:col-span-2' : '') + ''}>
                            <FieldRenderer meta={f} formik={formik} defs={defs} disabledFields={disabledFields}/>
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

            {((formik as any).submitCount > 0) && Array.isArray((formik.errors as any)?.__global) && (formik.errors as any).__global.length > 0 && (
                <div className="rounded-lg border border-error bg-error text-on-error p-3 text-sm">
                    <ul className="list-disc pl-5 space-y-1">
                        {(formik.errors as any).__global.map((msg: string, i: number) => (
                            <li key={i}>{msg}</li>
                        ))}
                    </ul>
                </div>
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
