import {Button, classNames, Tab, Tabs} from "@udixio/ui-react";
import React, {useEffect, useLayoutEffect, useState} from "react";


export const Menu = ({
                         setFabVisible,
                         fabVisible,
                     }: {
    fabVisible: boolean;
    setFabVisible: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
    const [pathName, setPathName] = useState<string | null>(null);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const getCurrentTab = () => {
        if (pathName === "/") {
            return null;
        } else if (pathName === "/services") {
            return 0;
        } else if (pathName === "/methode") {
            return 1;
        } else if (pathName === "/realisations") {
            return 2;
        } else if (pathName?.startsWith("/realisations/")) {
            return 2;
        } else if (pathName?.startsWith("/ressources")) {
            return 3;
        } else if (pathName === "/agence") {
            return 4;
        } else if (pathName === "/contact") {
            return 5;
        } else {
            return undefined;
        }
    };
    const [activeTab, setActiveTab] = useState<number | null | undefined>(undefined);


    useLayoutEffect(() => {
        const handleURLChange = () => {
            setPathName(window.location.pathname)
        };

        window.addEventListener("popstate", handleURLChange);
        handleURLChange();

        return () => {
            window.removeEventListener("popstate", handleURLChange);
        };
    }, []);

    useEffect(() => {
        const result = getCurrentTab()
        setActiveTab(result)
    }, [pathName]);


    // Intersection Observer to hide menu when reaching Footer/Contact
    useEffect(() => {
        const featuresDiv = document.getElementById("contact")!;

        const featuresObserver = new IntersectionObserver(
            ([entry]) => {
                if (entry && entry.isIntersecting) {
                    setActiveTab(null);
                    setFabVisible(false);
                } else {
                    setActiveTab(getCurrentTab());
                    setFabVisible(true);
                }
            },
            {threshold: [0]},
        );

        if (featuresDiv) featuresObserver.observe(featuresDiv);

        return () => featuresObserver.disconnect();
    }, [pathName]);

    return (
        pathName !== null &&
        <div
            className={classNames(
                "fixed max-w-full flex items-center transition-all duration-500 ease-in-out left-1/2 -translate-x-1/2 z-50 mx-2 overflow-hidden rounded-full",
                // Dynamic Styles based on Scroll
                isScrolled
                    ? "top-6 backdrop-blur-lg border border-surface-container-highest bg-surface-container-low/90 shadow-sm py-1 px-1"
                    : "top-8 border border-transparent bg-transparent py-2 px-4", // Transparent & slightly lower/larger when at top
                {"opacity-0": activeTab === null && pathName !== "/"},
            )}
        >
            {/* VISIBILITY FIX: The original code utilized activeTab === null to hide.
                 The observer sets activeTab to null.
                 I need to ensure `getCurrentTab` returns `undefined` (or -1) for Home, NOT `null`.
             */}
            <Tabs
                scrollable
                selectedTab={activeTab === undefined ? undefined : activeTab} // explicit
                setSelectedTab={setActiveTab}
                className={classNames(
                    "max-w-3xl border-none md:overflow-visible transition-all bg-transparent",
                    !isScrolled ? "gap-4 hover:bg-surface-container/20 text-on-surface" : "" // Add breathing room when transparent
                )}
                variant={isScrolled ? "secondary" : "primary"} // Change variant? Or just style. Primary might be too bold. Let's stick to secondary but adjust via class/context if needed.
            >

                {/* Removed Accueil Tab */}

                <Tab
                    className={classNames()}
                    selected={0 === activeTab}
                    href={`/services`}
                    label={"Services"}
                ></Tab>
                <Tab
                    className={classNames()}
                    selected={1 === activeTab}
                    href={`/methode`}
                    label={"Méthode"}
                ></Tab>
                <Tab
                    className={classNames()}
                    selected={2 === activeTab}
                    href={`/realisations`}
                    label={"Réalisations"}
                ></Tab>
                <Tab
                    className={classNames()}
                    selected={3 === activeTab}
                    href={`/ressources`}
                    label={"Ressources"}
                ></Tab>
                <Tab
                    className={classNames()}
                    selected={4 === activeTab}
                    href={`/agence`}
                    label={"Agence"}
                ></Tab>
                <Tab
                    className={" md:hidden block"}
                    selected={5 === activeTab}
                    href={`/contact`}
                    label={"Contact"}
                ></Tab>


            </Tabs>
            <Button
                size={"small"}
                allowShapeTransformation={false}
                href={"/contact"}
                className={classNames("m-2 hidden md:block transition-all", !isScrolled ? "bg-primary text-on-primary shadow-lg" : "")}
                label={"Contact"}
            />
        </div>
    );
};
