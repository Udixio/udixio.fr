import React, {useActionState} from 'react';
import DynamicForm from '@components/app/form/DynamicForm.tsx';
import {actions} from 'astro:actions';
import {buildRelationPayload} from '@components/app/utils/normalize.ts';

type Props = {
    model: string;
    value?: Record<string, any>;
    onChange?: (value: Record<string, any>) => void;
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
export default function DynamicDataCreate({model, onSuccess, ...rest}: Props) {
    const [createRes, createEntityAction] = useActionState(actions.createEntity as any, undefined);

    return (
        <DynamicForm
            {...(rest as any)}
            model={model}
            submitLabel={rest.submitLabel ?? 'Créer'}
            // submissionHandler fournit par le wrapper pour gérer la deep creation
            submissionHandler={async ({
                                          values,
                                          relations,
                                          relationState,
                                          createEntityAction: childCreate,
                                          createEntityRes
                                      }) => {
                // Construire le payload parent en tenant compte des relations (bottom-up pour les singulières en create)
                const payload = await buildRelationPayload(values, relations, relationState as any, childCreate, createEntityRes);
                // Créer l'entité racine

                console.log({model, dataJson: JSON.stringify(payload || {})} as any);

                const created = await createEntityAction({model, dataJson: JSON.stringify(payload || {})} as any);
                // Callback succès
                const createdData = (created as any)?.data || (createRes as any)?.data;
                if (createdData) onSuccess?.(createdData);
            }}
        />
    );
}
