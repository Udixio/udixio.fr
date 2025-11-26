import React, {useRef} from "react";
import DynamicFormController from "@components/app/form/DynamicFormController.tsx";

export type RelationState = import("@components/app/form/DynamicFormController.tsx").RelationState;

type Props = {
  model: string;
  value?: Record<string, any>;
  onChange?: (value: Record<string, any>) => void;
  onSubmit?: (value: Record<string, any>) => Promise<any> | any;
  // Handler de soumission optionnel injecté par les wrappers (DynamicDataCreate/Update)
  submissionHandler?: (args: any) => Promise<any>;
  exclude?: string[];
  disabledFields?: string[];
  className?: string;
  submitLabel?: string;
  cancelLabel?: string;
  hideSubmit?: boolean; // ignoré mais conservé pour compat rétro
  mode?: 'create' | 'update';
  relationsDepth?: number;
  level?: number;
  onCancel?: () => void;
  ancestors?: string[];
};

export default function DynamicForm(props: Props) {
  const formRef = useRef<HTMLFormElement | null>(null);
  return (
    <form
      ref={formRef}
      className={"max-w-screen-xl space-y-4 " + (props.className || '')}
      onSubmit={(e) => {
        e.preventDefault();
        // délégué à Formik interne
      }}
    >
      <DynamicFormController {...(props as any)} embedded={false} />
    </form>
  );
}
