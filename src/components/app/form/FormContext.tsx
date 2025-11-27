import React, {createContext, useContext} from 'react';

export type FormRegistry = {
  register: (id: string, validate: () => Promise<void | boolean>) => void;
  unregister: (id: string) => void;
};

const defaultRegistry: FormRegistry = {
  register: () => {},
  unregister: () => {},
};

export const FormContext = createContext<FormRegistry | null>(defaultRegistry);

export function useFormContext() {
  return useContext(FormContext);
}
