import {NavigationRail, NavigationRailItem, NavigationRailSection} from "@udixio/ui-react"
// FontAwesome icons (regular/solid pairs)
import {
    faDiagramProject as farDiagramProject,
    faMagnifyingGlassChart as farMagnifyingGlassChart,
    faHandshake as farHandshake,
    faListCheck as farListCheck,
    faFileLines as farFileLines,
    faBriefcase as farBriefcase,
    faGear as farGear,
    faPhone as farPhone,
} from "@fortawesome/pro-regular-svg-icons";
import {
    faDiagramProject as fasDiagramProject,
    faMagnifyingGlassChart as fasMagnifyingGlassChart,
    faHandshake as fasHandshake,
    faListCheck as fasListCheck,
    faFileLines as fasFileLines,
    faBriefcase as fasBriefcase,
    faGear as fasGear,
    faPhone as fasPhone,
} from "@fortawesome/pro-solid-svg-icons";

export const Navigation = () => {

    return <NavigationRail className="bg-surface-container-highest" alignment="top">
        {/* Primary, frequently used items */}
        <NavigationRailItem icon={farDiagramProject} iconSelected={fasDiagramProject} selected>
            Projects
        </NavigationRailItem>
        <NavigationRailItem icon={farHandshake} iconSelected={fasHandshake}>
            Deals
        </NavigationRailItem>
        <NavigationRailItem icon={farPhone} iconSelected={fasPhone}>
            Activities
        </NavigationRailItem>
        <NavigationRailItem icon={farMagnifyingGlassChart} iconSelected={fasMagnifyingGlassChart}>
            Audits
        </NavigationRailItem>
        <NavigationRailItem icon={farListCheck} iconSelected={fasListCheck}>
            Tasks
        </NavigationRailItem>

        {/* Rarely accessed items kept behind the burger/menu section */}
        <NavigationRailSection label={"More"}/>
        <NavigationRailItem icon={farFileLines} iconSelected={fasFileLines}>
            Documents
        </NavigationRailItem>
        <NavigationRailItem icon={farBriefcase} iconSelected={fasBriefcase}>
            Services
        </NavigationRailItem>
        <NavigationRailItem icon={farGear} iconSelected={fasGear}>
            Settings
        </NavigationRailItem>
    </NavigationRail>
}
