import React from 'react';
import DynamicForm from '@components/app/form/DynamicForm.tsx';
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
            submitLabel={rest.submitLabel ?? 'Créer'}
            // submissionHandler fournit par le wrapper pour gérer la deep creation
            submissionHandler={async () => {
                const createdData = await draftsService.save({ formId, model });
                if (createdData) onSuccess?.(createdData);
            }}
        />
    );
}
