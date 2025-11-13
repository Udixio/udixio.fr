import {NavigationRail, NavigationRailItem} from "@udixio/ui-react"
import {faChartMixed as farChartMixed} from "@fortawesome/pro-regular-svg-icons";
import {faChartMixed as fasChartMixed} from "@fortawesome/pro-solid-svg-icons";

export const Navigation = () => {

    return <NavigationRail className="bg-surface-container-highest" alignment="top">
        <NavigationRailItem icon={farChartMixed} iconSelected={fasChartMixed} selected>Audits</NavigationRailItem>
    </NavigationRail>
}
