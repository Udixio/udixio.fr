import {NavigationRail, NavigationRailItem} from "@udixio/ui-react"
// FontAwesome icons (regular/solid pairs)
import {
    faDiagramProject as farDiagramProject,
    faHandshake as farHandshake,
    faMagnifyingGlassChart as farMagnifyingGlassChart,
    faUser as farUser,
} from "@fortawesome/pro-regular-svg-icons";
import {
    faDiagramProject as fasDiagramProject,
    faHandshake as fasHandshake,
    faMagnifyingGlassChart as fasMagnifyingGlassChart,
    faUser as fasUser,
} from "@fortawesome/pro-solid-svg-icons";

export const Navigation = () => {

    return <NavigationRail className="bg-surface-container-highest" alignment="top">
        {/* Primary: orienté CRM autour du Client */}
        <NavigationRailItem href={"/app/deals"} icon={farHandshake} iconSelected={fasHandshake}>
            Pipeline
        </NavigationRailItem>
        <NavigationRailItem href={"/app/clients"} icon={farUser} iconSelected={fasUser}>
            Clients
        </NavigationRailItem>
        <NavigationRailItem href={"/app/audits"} icon={farMagnifyingGlassChart} iconSelected={fasMagnifyingGlassChart}>
            Audits
        </NavigationRailItem>
        <NavigationRailItem href={"/app/projects"} icon={farDiagramProject} iconSelected={fasDiagramProject}>
            Projets
        </NavigationRailItem>
        {/* Secondaire */}
        {/*<NavigationRailSection label={"Plus"}/>*/}

        {/*<NavigationRailItem href={"/app/tasks"} icon={farListCheck} iconSelected={fasListCheck}>*/}
        {/*    Tâches*/}
        {/*</NavigationRailItem>*/}
        {/*<NavigationRailItem href={"/app/documents"} icon={farFileLines} iconSelected={fasFileLines}>*/}
        {/*    Documents*/}
        {/*</NavigationRailItem>*/}
        {/*<NavigationRailItem href={"/app/services"} icon={farBriefcase} iconSelected={fasBriefcase}>*/}
        {/*    Services*/}
        {/*</NavigationRailItem>*/}
        {/*<NavigationRailItem href={"/app/settings"} icon={farGear} iconSelected={fasGear}>*/}
        {/*    Paramètres*/}
        {/*</NavigationRailItem>*/}
    </NavigationRail>
}
