import {atom} from 'nanostores';
import {actions} from 'astro:actions';

export type ModelsState = {
    models: Record<string, Record<string, any>> | null;
};

export const modelsStore = atom<ModelsState>({models: null});

type ModelsActionFn = (payload?: any) => Promise<any>;

export const modelsService = {
    load: async () => {
        const {data, error} = await actions.getModels({ /* ... */});
        modelsStore.set({models: data as any});
    },
};
