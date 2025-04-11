import {Button, classNames, Tab, Tabs} from "@udixio/ui";
import React, {useEffect, useLayoutEffect, useRef, useState} from "react";


function formatLabel(id) {
    return id
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

export const Menu = ({
                         setFabVisible,
                         fabVisible,
                     }: {
    fabVisible: boolean;
    setFabVisible: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
    const [pathName, setPathName] = useState<string | null>(null)
    const getCurrentTab = () => {
        if (pathName === "/") {
            return 0;
        } else if (pathName === "/nos-realisations") {
            return 1;
        } else if (pathName?.startsWith("/nos-realisations/")) {
            return 1;
        } else {
            return null;
        }
    };
    const [activeTab, setActiveTab] = useState<number | null>(null);


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


    const isScrolling = useRef(false);


    useEffect(() => {
        const handleHashChange = () => {
            isScrolling.current = true;

            setTimeout(() => {
                isScrolling.current = false;
            }, 750);
        };

        window.addEventListener("popstate", handleHashChange, false);
        return () => {
            window.removeEventListener("popstate", handleHashChange);
        };
    }, []);

    useEffect(() => {
        const featuresDiv = document.getElementById("contact")!;

        const featuresObserver = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setActiveTab(null);
                    setFabVisible(false);
                } else {
                    setActiveTab(getCurrentTab());
                    setFabVisible(true);
                }
            },
            {threshold: [0]},
        );
        featuresObserver.observe(featuresDiv);

        return () => featuresObserver.disconnect();
    }, [pathName]);

    return (
        pathName != null &&
        <div
            className={classNames(
                "fixed max-w-full flex transition-opacity left-1/2 duration-300 ease-in-out top-8 z-50 mx-2 backdrop-blur-lg -translate-x-1/2 overflow-hidden rounded-full border border-surface-container-highest bg-surface-container-low/80",
                {"opacity-0": activeTab === null},
            )}
        >
            <Tabs
                scrollable
                selectedTab={activeTab}
                setSelectedTab={setActiveTab}
                className={"max-w-3xl  border-none  md:overflow-hidden"}
                variant={"secondary"}
            >

                <Tab
                    className={"bg-transparent md:h-full"}
                    selected={0 === activeTab}
                    href={`/`}
                    label={"Accueil"}
                ></Tab>
                <Tab
                    className={"bg-transparent md:h-full"}
                    selected={1 === activeTab}
                    href={`/nos-realisations`}
                    label={"Réalisations"}
                ></Tab>
                <Tab
                    className={"bg-transparent md:h-full  md:hidden block"}
                    selected={1 === activeTab}
                    href={`#contact`}
                    label={"Contact"}
                ></Tab>


            </Tabs>
            <Button
                href={"#contact"}
                className={"m-2 hidden md:block"}
                label={"Contact"}
            />
        </div>
    );
};
