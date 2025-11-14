import {atom} from 'nanostores'

type AppConfig = { actions: { label: string, action: () => void }[] }
export const appStore = atom<AppConfig>({
        actions: null
    }
)

export const appService = {
    set: (args: AppConfig) => {
        appStore.set(args)
    }
}
