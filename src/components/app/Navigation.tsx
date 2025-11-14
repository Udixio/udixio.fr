import {NavigationRail, NavigationRailItem, NavigationRailSection} from "@udixio/ui-react"
// FontAwesome icons (regular/solid pairs)
import {
    faBriefcase as farBriefcase,
    faDiagramProject as farDiagramProject,
    faFileLines as farFileLines,
    faGear as farGear,
    faHandshake as farHandshake,
    faListCheck as farListCheck,
    faMagnifyingGlassChart as farMagnifyingGlassChart,
    faPhone as farPhone,
} from "@fortawesome/pro-regular-svg-icons";
import {
    faBriefcase as fasBriefcase,
    faDiagramProject as fasDiagramProject,
    faFileLines as fasFileLines,
    faGear as fasGear,
    faHandshake as fasHandshake,
    faListCheck as fasListCheck,
    faMagnifyingGlassChart as fasMagnifyingGlassChart,
    faPhone as fasPhone,
} from "@fortawesome/pro-solid-svg-icons";

export const Navigation = () => {

    return <NavigationRail className="bg-surface-container-highest" alignment="top">
        {/* Primary, frequently used items */}
        <NavigationRailItem href={"/projects"} icon={farDiagramProject} iconSelected={fasDiagramProject} selected>
            Projects
        </NavigationRailItem>
        <NavigationRailItem href={"/deals"} icon={farHandshake} iconSelected={fasHandshake}>
            Deals
        </NavigationRailItem>
        <NavigationRailItem href={"/activities"} icon={farPhone} iconSelected={fasPhone}>
            Activities
        </NavigationRailItem>
        <NavigationRailItem href={"/audits"} icon={farMagnifyingGlassChart} iconSelected={fasMagnifyingGlassChart}>
            Audits
        </NavigationRailItem>
        <NavigationRailItem href={"/tasks"} icon={farListCheck} iconSelected={fasListCheck}>
            Tasks
        </NavigationRailItem>

        {/* Rarely accessed items kept behind the burger/menu section */}
        <NavigationRailSection label={"More"}/>
        <NavigationRailItem href={"/documents"} icon={farFileLines} iconSelected={fasFileLines}>
            Documents
        </NavigationRailItem>
        <NavigationRailItem href={"/services"} icon={farBriefcase} iconSelected={fasBriefcase}>
            Services
        </NavigationRailItem>
        <NavigationRailItem href={"/settings"} icon={farGear} iconSelected={fasGear}>
            Settings
        </NavigationRailItem>
    </NavigationRail>
}
