import React from "react";
// @ts-ignore
import {Button, Divider} from "@udixio/ui-react";
import {FieldRenderer} from "@components/app/form/FieldRenderer.tsx";
import {RelationField} from "@components/app/form/RelationField.tsx";

type DynamicFormFieldsProps = {
  // Formik instance (read + actions)
  formik: any;
  // Computed model definition
  scalarFields: any[];
  relations: any[];
  relationGroups: { key: string; items: any[] }[];
  defs: Record<string, any> | undefined;
  modelUI?: any;
  // Relations UI state and helpers
  relationUIState: Record<string, any>;
  updateRelationState: (rf: any, updater: (prev: any) => any) => void;
  reloadRelationOptions: (rf: any, q: string) => void;
  // Context
  model: string;
  parentFormId: string;
  disabledFields?: string[];
  relationsDepth: number;
  level: number;
  ancestors: string[];
  getPreviewKeys: (targetModel: string) => string[];
  // Actions area
  showActions: boolean;
  submitLabel: string;
  cancelLabel: string;
  onCancel?: () => void;
};

export default function DynamicFormFields({
  formik,
  scalarFields,
  relations,
  relationGroups,
  defs,
  modelUI,
  relationUIState,
  updateRelationState,
  reloadRelationOptions,
  model,
  parentFormId,
  disabledFields,
  relationsDepth,
  level,
  ancestors,
  getPreviewKeys,
  showActions,
  submitLabel,
  cancelLabel,
  onCancel,
}: DynamicFormFieldsProps) {
  // Helper
  const isStateActive = (rf: any, st?: any) => {
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

  return (
    <>
      {/* Scalars */}
      {!!scalarFields.length && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {scalarFields.map((f: any) => (
            <div key={f.name} className={(f.type === 'Json' ? 'md:col-span-2' : '') + ''}>
              <FieldRenderer meta={f} formik={formik} defs={defs} disabledFields={disabledFields} />
            </div>
          ))}
        </div>
      )}

      {/* Relations */}
      {relationsDepth !== 0 && relations.length > 0 && (
        <>
          {relationGroups.map((group) => {
            const isMutexGroup = group.key.startsWith('mutex:') && group.items.length > 1;
            if (isMutexGroup) {
              const mutexKey = group.key.substring('mutex:'.length);
              const groupInfo = (modelUI as any)?.mutexGroups?.[mutexKey];
              const active = group.items.find((rf: any) => relationUIState[rf.name]?.adding);
              return (
                <div key={group.key} className="flex flex-col gap-3">
                  <div className="space-y-4 mt-8 mb-4">
                    <Divider />
                    {groupInfo && (
                      <div className="flex flex-col">
                        {groupInfo.label && <div className="text-title-medium">{groupInfo.label}</div>}
                        {groupInfo.description && (
                          <div className="text-sm text-on-surface-variant">{groupInfo.description}</div>
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 items-center">
                      {group.items.map((rf: any) => {
                        const st = relationUIState[rf.name];
                        const activated = !!st?.adding;
                        const btnLabel =
                          (groupInfo?.items && groupInfo.items[rf.name]?.label) || rf.ui?.label || rf.documentation || rf.name;
                        return (
                          <Button
                            key={rf.name}
                            type="button"
                            variant="tonal"
                            label={btnLabel}
                            activated={activated}
                            onToggle={(newState: boolean) => {
                              if (newState) {
                                updateRelationState(rf, (prev: any) => ({
                                  ...prev,
                                  adding: true,
                                  open: true,
                                  mode: rf?.ui?.forceMode || (level === 1 ? 'create' : 'associate'),
                                }));
                              } else {
                                updateRelationState(rf, (prev: any) => ({ ...prev, adding: false }));
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
                        parentFormId={parentFormId}
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
                parentFormId={parentFormId}
                previewKeys={getPreviewKeys}
              />
            ));
          })}
        </>
      )}

      {(formik as any).submitCount > 0 &&
        Array.isArray((formik.errors as any)?.__global) &&
        (formik.errors as any).__global.length > 0 && (
          <div className="rounded-lg border border-error bg-error text-on-error p-3 text-sm">
            <ul className="list-disc pl-5 space-y-1">
              {(formik.errors as any).__global.map((msg: string, i: number) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

      {showActions && (
        <div className="flex items-center justify-end gap-2 mt-3">
          {onCancel && (
            <Button type="button" variant="outlined" onClick={() => onCancel?.()}>
              {cancelLabel}
            </Button>
          )}
          <Button type="button" disabled={formik.isSubmitting} onClick={() => formik.submitForm()}>
            {formik.isSubmitting ? 'Envoi…' : submitLabel}
          </Button>
        </div>
      )}
    </>
  );
}
