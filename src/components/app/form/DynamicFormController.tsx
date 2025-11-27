import React, {startTransition, useActionState, useEffect, useMemo, useReducer, useRef} from "react";
import {useFormik} from 'formik';
import {actions} from 'astro:actions';
import {useStore} from "@nanostores/react";
import {modelsService, modelsStore} from "@/stores/modelsStore.ts";
import DynamicFormFields from "@components/app/form/DynamicFormFields.tsx";
import {getPreviewKeysFromDefs, makePreviewLabelFromDefs, useModelDefinition} from "./useModelDefinition.ts";
import {computeDefaultValues} from "../utils/defaults.ts";
import {buildRelationPayload, normalizeScalarValues} from "../utils/normalize.ts";
import {draftsService} from "@/stores/draftsStore.ts";
import {FormContext, useFormContext} from "@components/app/form/FormContext.tsx";

export type RelationState = {
    // Common
    mode?: 'associate' | 'create';
    open?: boolean; // section ouverte/collapsée (pour limiter l'affichage)
    adding?: boolean; // UI d'ajout en cours (affiche Tabs + contenu)
    search: string;
    options: { id: string; label: string; data?: any }[];
    loading: boolean;
    selectedLabels?: Record<string, string>; // id -> label pour affichage
    selectedItems?: Record<string, any>; // id -> full item (for preview rows)
    // Singular
    selectedId?: string;
    createValues?: Record<string, any>;
    // List
    selectedIds?: string[];
    createDraft?: Record<string, any>;
    createItems?: Record<string, any>[];
};

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
    // Identifiant du formulaire pour le store global
    formId?: string;
    // Si fourni, remplace la logique interne de soumission (utilisé par les wrappers DynamicData*)
    submissionHandler?: (args: {
        values: Record<string, any>;
        scalarFields: any[];
        relations: any[];
        relationState: Record<string, RelationState>;
    }) => Promise<any>;
    // Optionally filter fields
    exclude?: string[];
    disabledFields?: string[];
    className?: string;
    submitLabel?: string;
    cancelLabel?: string;
    mode?: 'create' | 'update';
    relationsDepth?: number;
    level?: number;
    onCancel?: () => void;
    ancestors?: string[];
    embedded?: boolean; // if true: no actions/footer and no form tag here
};

export default function DynamicFormController({
                                                  model,
                                                  value,
                                                  onChange,
                                                  onSubmit,
                                                  formId = 'root',
                                                  submissionHandler,
                                                  onCancel,
                                                  exclude,
                                                  disabledFields,
                                                  className,
                                                  submitLabel = 'Enregistrer',
                                                  cancelLabel = 'Annuler',
                                                  mode = 'create',
                                                  relationsDepth = -1,
                                                  level = 1,
                                                  ancestors = [],
                                                  embedded = false,
                                              }: Props) {
    // --- Registry (children validators) ---
    const registryRef = useRef<Map<string, () => Promise<void | boolean>>>(new Map());
    const register = (id: string, validate: () => Promise<void | boolean>) => {
        registryRef.current.set(id, validate);
    };
    const unregister = (id: string) => {
        registryRef.current.delete(id);
    };
    const parentForm = useFormContext();
    const $models = useStore(modelsStore);
    useEffect(() => {
        if (!$models.models) {
            modelsService.load();
        }
    }, []);

    // Additional actions used by the dynamic relations (React 19 useActionState)
    const [listEntitiesRes, listEntitiesAction] = useActionState(actions.listEntities as any, undefined);
    const [createEntityRes, createEntityAction] = useActionState(actions.createEntity as any, undefined);

    const {scalarFields, relations, relationGroups, defs, modelUI} = useModelDefinition({
        model,
        defs: $models.models as any,
        exclude,
        mode,
        relationsDepth,
        ancestors,
    });

    const defaultValues = useMemo(() => {
        // Préférer la valeur du store si présente, sinon la prop value
        const existing = draftsService.get<Record<string, any>>(formId);
        return computeDefaultValues(scalarFields, existing ?? value);
    }, [scalarFields, value, formId]);

    const [relationUIState, dispatch] = useReducer(relationReducer, {} as Record<string, RelationState>);
    const updateRelationState = (rf: any, updater: (prev: RelationState) => RelationState) => {
        dispatch({type: 'UPDATE', relation: rf, updater, relations});
    };

    const getPreviewKeys = (targetModel: string): string[] => getPreviewKeysFromDefs(defs as any, targetModel);
    const makePreviewLabel = (targetModel: string, it: any): string => makePreviewLabelFromDefs(defs as any, targetModel, it);

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
            // Global (relations) errors
            const globalErrs: string[] = [];
            try {
                for (const rf of relations) {
                    const required = (!!rf.isRequired && !rf.isList) || !!rf?.ui?.required;
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
            }
            if (globalErrs.length > 0) {
                (errors as any).__global = globalErrs;
            }
            return errors;
        },
        onSubmit: async (vals, helpers) => {
            const normalized = normalizeScalarValues(vals, scalarFields);
            try {
                // 1) Demander la validation de tous les sous-formulaires enregistrés
                const validators = Array.from(registryRef.current.values());
                if (validators.length > 0) {
                    for (const v of validators) {
                        // Chaque validateur doit soit résoudre à true/void, soit throw pour indiquer l'échec
                        const ok = await v();
                        if (ok === false) throw new Error('Invalid child form');
                    }
                }
                if (submissionHandler) {
                    await submissionHandler({
                        values: normalized,
                        scalarFields,
                        relations,
                        relationState: relationUIState,
                    });
                } else {
                    const withRelations = await buildRelationPayload(normalized, relations, relationUIState, undefined, formId);
                    await onSubmit?.(withRelations);
                }
                helpers.setSubmitting(false);
            } catch (e) {
                helpers.setSubmitting(false);
            }
        }
    });
    // Synchronisation: écrire les valeurs dans le store global des brouillons
    useEffect(() => {
        draftsService.update(formId, formik.values);
        // Optionnel: on peut encore propager onChange si fourni
        onChange?.(formik.values);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formId, formik.values]);

    const reloadRelationOptions = (rf: any, q: string) => {
        updateRelationState(rf, (st) => ({...st, loading: true, search: q}));
        startTransition(async () => {
            try {
                const resp = await listEntitiesAction({model: rf.targetModel, q, limit: 25} as any);
                const payload = (resp as any)?.data || (listEntitiesRes as any)?.data;
                const options = ((payload?.items) || []).map((it: any) => {
                    const label = rf?.isList
                        ? makePreviewLabel(rf.targetModel, it)
                        : (() => {
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

    // Auto-activate first item in mutex groups when none is active
    useEffect(() => {
        for (const g of relationGroups) {
            const isMutexGroup = g.key.startsWith('mutex:') && g.items.length > 1;
            if (!isMutexGroup) continue;
            const anyActive = g.items.some((rf: any) => {
                const st = (relationUIState as any)[rf.name];
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
            });
            if (anyActive) continue;
            const first = g.items[0];
            if (!first) continue;
            updateRelationState(first, (prev) => ({
                ...prev,
                adding: true,
                open: true,
                mode: (first?.ui?.forceMode || (level === 1 ? 'create' : 'associate'))
            }));
            break;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(relationGroups.map(g => g.items.map((it: any) => it.name))), relationUIState]);

    // Revalidate after relation state changes
    useEffect(() => {
        if ((formik as any).submitCount > 0) {
            formik.validateForm();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(relationUIState)]);

    // 2) Si ce formulaire est embarqué (sous-formulaire), s'enregistrer auprès du parent
    useEffect(() => {
        // s'enregistrer uniquement si on est imbriqué
        if (!embedded) return;
        const validateSelf = async () => {
            try {
                // Valider d'abord les sous-formulaires de ce formulaire (profondeur arbitraire)
                const childValidators = Array.from(registryRef.current.values());
                if (childValidators.length > 0) {
                    for (const v of childValidators) {
                        const ok = await v();
                        if (ok === false) throw new Error('Invalid nested child form');
                    }
                }
                // Marquer tous les champs comme touchés pour afficher les erreurs
                const touchedAll: Record<string, any> = {};
                for (const k of Object.keys(formik.values || {})) touchedAll[k] = true;
                formik.setTouched(touchedAll, true);
                const errs = await formik.validateForm();
                // Il y a erreur si des clés existent (hors __global) ou si __global contient des messages
                const keys = Object.keys(errs || {}).filter(k => k !== '__global');
                const hasGlobal = Array.isArray((errs as any).__global) && (errs as any).__global.length > 0;
                if (keys.length > 0 || hasGlobal) throw new Error('Invalid child form');
                return true;
            } catch (e) {
                throw e;
            }
        };
        parentForm.register(formId, validateSelf);
        return () => {
            parentForm.unregister(formId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [embedded, formId]);

    return (
        <FormContext.Provider value={{register, unregister}}>
            <div className={"max-w-screen-xl space-y-4 " + (className || '')}>
                <DynamicFormFields
                    formik={formik}
                    scalarFields={scalarFields}
                    relations={relations}
                    relationGroups={relationGroups}
                    defs={defs}
                    modelUI={modelUI}
                    relationUIState={relationUIState}
                    updateRelationState={updateRelationState}
                    reloadRelationOptions={reloadRelationOptions}
                    model={model}
                    parentFormId={formId}
                    setParentFieldValue={formik.setFieldValue}
                    disabledFields={disabledFields}
                    relationsDepth={relationsDepth}
                    level={level}
                    ancestors={ancestors}
                    getPreviewKeys={getPreviewKeys}
                    showActions={!embedded}
                    submitLabel={submitLabel}
                    cancelLabel={cancelLabel}
                    onCancel={onCancel}
                />
            </div>
        </FormContext.Provider>
    );
}
