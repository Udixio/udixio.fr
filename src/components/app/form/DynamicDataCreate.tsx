import React from 'react';
import DynamicForm from '@components/app/form/DynamicForm.tsx';
import {actions} from 'astro:actions';
import {buildRelationPayload} from '@components/app/utils/normalize.ts';
import {draftsService} from '@/stores/draftsStore.ts';

type Props = {
    model: string;
    value?: Record<string, any>;
    onChange?: (value: Record<string, any>) => void;
    formId?: string;
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
    onSuccess?: (created: any) => void;
};

/**
 * Wrapper intelligent de création.
 * - Délègue le rendu à DynamicForm
 * - Intercepte la soumission via submissionHandler pour orchestrer la deep creation
 */
export default function DynamicDataCreate({model, onSuccess, formId = 'root', ...rest}: Props) {
    return (
        <DynamicForm
            {...(rest as any)}
            model={model}
            formId={formId}
            submitLabel={rest.submitLabel}
            // submissionHandler fournit par le wrapper pour gérer la deep creation
            submissionHandler={async ({values, relations, relationState}) => {
                // Construire le payload parent en tenant compte des relations (bottom-up pour les singulières en create)
                const payload = await buildRelationPayload(values, relations, relationState as any, undefined, formId);

                // Créer l'entité racine via Astro actions directement (awaitable)
                const created = await (actions as any).createEntity({
                    model,
                    dataJson: JSON.stringify(payload || {}),
                } as any);
                const createdData = (created as any)?.data || created;
                if (createdData) {
                    // Nettoyer les brouillons liés à ce formulaire (et ses enfants)
                    draftsService.clear(formId, true);
                    onSuccess?.(createdData);
                }
            }}
        />
    );
}
