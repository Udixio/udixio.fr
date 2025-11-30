import {NavigationRail, NavigationRailItem} from "@udixio/ui-react"
// FontAwesome icons (regular/solid pairs)
import {
    faBullseye as farBullseye,
    faDiagramProject as farDiagramProject,
    faMagnifyingGlassChart as farMagnifyingGlassChart,
    faUserPlus as farUserPlus,
} from "@fortawesome/pro-regular-svg-icons";
import {
    faBullseye as fasBullseye,
    faDiagramProject as fasDiagramProject,
    faMagnifyingGlassChart as fasMagnifyingGlassChart,
    faUserPlus as fasUserPlus,
} from "@fortawesome/pro-solid-svg-icons";

export const Navigation = () => {

    return <NavigationRail className="bg-surface-container-highest" alignment="top">
        {/* Primary: orienté CRM autour du Client */}
        <NavigationRailItem href={"/app/leads"} icon={farBullseye} iconSelected={fasBullseye}>
            Leads
        </NavigationRailItem>

        <NavigationRailItem href={"/app/prospects"} icon={farUserPlus} iconSelected={fasUserPlus}>
            Prospects
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
