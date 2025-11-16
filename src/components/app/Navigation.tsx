import {NavigationRail, NavigationRailItem, NavigationRailSection} from "@udixio/ui-react"
// FontAwesome icons (regular/solid pairs)
import {
    faUser as farUser,
    faBuilding as farBuilding,
    faBriefcase as farBriefcase,
    faDiagramProject as farDiagramProject,
    faFileLines as farFileLines,
    faGear as farGear,
    faHandshake as farHandshake,
    faListCheck as farListCheck,
    faMagnifyingGlassChart as farMagnifyingGlassChart,
    faPhone as farPhone,
    faAddressBook as farAddressBook,
} from "@fortawesome/pro-regular-svg-icons";
import {
    faUser as fasUser,
    faBuilding as fasBuilding,
    faBriefcase as fasBriefcase,
    faDiagramProject as fasDiagramProject,
    faFileLines as fasFileLines,
    faGear as fasGear,
    faHandshake as fasHandshake,
    faListCheck as fasListCheck,
    faMagnifyingGlassChart as fasMagnifyingGlassChart,
    faPhone as fasPhone,
    faAddressBook as fasAddressBook,
} from "@fortawesome/pro-solid-svg-icons";

export const Navigation = () => {

    return <NavigationRail className="bg-surface-container-highest" alignment="top">
        {/* Primary: orienté CRM autour du Client */}
        <NavigationRailItem href={"/app/clients"} icon={farUser} iconSelected={fasUser}>
            Clients
        </NavigationRailItem>
        <NavigationRailItem href={"/app/deals"} icon={farHandshake} iconSelected={fasHandshake}>
            Pipeline
        </NavigationRailItem>
        <NavigationRailItem href={"/app/organizations"} icon={farBuilding} iconSelected={fasBuilding}>
            Organisations
        </NavigationRailItem>
        <NavigationRailItem href={"/app/projects"} icon={farDiagramProject} iconSelected={fasDiagramProject}>
            Projets
        </NavigationRailItem>
        <NavigationRailItem href={"/app/activities"} icon={farPhone} iconSelected={fasPhone}>
            Activités
        </NavigationRailItem>
        <NavigationRailItem href={"/app/contacts"} icon={farAddressBook} iconSelected={fasAddressBook}>
            Contacts
        </NavigationRailItem>

        {/* Secondaire */}
        <NavigationRailSection label={"Plus"}/>
        <NavigationRailItem href={"/app/audits"} icon={farMagnifyingGlassChart} iconSelected={fasMagnifyingGlassChart}>
            Audits
        </NavigationRailItem>
        <NavigationRailItem href={"/app/tasks"} icon={farListCheck} iconSelected={fasListCheck}>
            Tâches
        </NavigationRailItem>
        <NavigationRailItem href={"/app/documents"} icon={farFileLines} iconSelected={fasFileLines}>
            Documents
        </NavigationRailItem>
        <NavigationRailItem href={"/app/services"} icon={farBriefcase} iconSelected={fasBriefcase}>
            Services
        </NavigationRailItem>
        <NavigationRailItem href={"/app/settings"} icon={farGear} iconSelected={fasGear}>
            Paramètres
        </NavigationRailItem>
    </NavigationRail>
}
