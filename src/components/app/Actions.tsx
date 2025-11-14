import {Button, FabMenu} from "@udixio/ui-react";
import {faPlus} from "@fortawesome/pro-light-svg-icons";
import {appStore} from "@/stores/appStore.ts";
import {useStore} from "@nanostores/react";

export const Actions = () => {
    const $appStore = useStore(appStore);
    return <FabMenu className={'fixed bottom-8 right-8'} variant="tertiary" size="large" label="Create" icon={faPlus}>
        {$appStore.actions && $appStore.actions.map(({label, action}) => (
            <Button key={label} onClick={action}>
                {label}
            </Button>
        ))}
    </FabMenu>
}