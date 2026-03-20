import { Button, Card, classNames, Tab, Tabs } from "@udixio/ui-react";
import React, { useEffect, useLayoutEffect, useState } from "react";

const MENU_TABS: Record<string, string> = {
  "/": "Accueil",
  "/services": "Services",
  "/methode": "Méthode",
  "/realisations": "Réalisations",
  "/agence": "Agence",
  "/contact": "Contact",
};

export const Menu = ({
  setFabVisible,
  fabVisible,
  isScrolled,
}: {
  fabVisible: boolean;
  isScrolled: boolean;
  setFabVisible: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const [pathName, setPathName] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useLayoutEffect(() => {
    const handleURLChange = () => {
      setPathName(window.location.pathname);
    };

    window.addEventListener("popstate", handleURLChange);
    handleURLChange();

    return () => {
      window.removeEventListener("popstate", handleURLChange);
    };
  }, []);

  // Intersection Observer to hide menu when reaching Footer/Contact
  useEffect(() => {
    const featuresDiv = document.getElementById("contact");

    if (!featuresDiv) return;

    const featuresObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.isIntersecting) {
          setIsVisible(false);
          setFabVisible(false);
        } else {
          setIsVisible(true);
          setFabVisible(true);
        }
      },
      { threshold: [0] },
    );

    featuresObserver.observe(featuresDiv);

    return () => featuresObserver.disconnect();
  }, [pathName, setFabVisible]);

  return (
    pathName !== null && (
      <Card
        variant={"filled"}
        className={classNames(
          " max-w-full  rounded-full flex transition-all duration-500 ease-in-out z-50 mx-2 overflow-hidden",
          {
            "bg-transparent backdrop-blur-none rounded-none": !isScrolled,
            "bg-surface-container-lowest/80 backdrop-blur-md shadow-md":
              isScrolled,
          },
          { "opacity-0": !isVisible },
        )}
      >
        <Tabs
          scrollable
          className={classNames(
            "max-w-3xl border-none md:overflow-visible transition-all bg-transparent",
            !isScrolled
              ? "gap-4 hover:bg-surface-container/20 text-on-surface"
              : "", // Add breathing room when transparent
          )}
          variant={isScrolled ? "secondary" : "primary"}
        >
          {Object.entries(MENU_TABS).map(([href, label]) => {
            const isSelected =
              pathName === href || (href !== "/" && pathName?.startsWith(href));

            return (
              <Tab
                key={href}
                className={classNames({
                  "md:hidden block": href === "/contact",
                  "h-full": isScrolled,
                })}
                selected={isSelected}
                href={href}
                label={label}
              />
            );
          })}
        </Tabs>
        {isScrolled && (
          <Button
            size={"small"}
            allowShapeTransformation={false}
            href={"/contact"}
            className={classNames(
              "m-2 hidden md:block transition-all",
              !isScrolled ? "bg-primary text-on-primary shadow-lg" : "",
            )}
            label={"Contact"}
          />
        )}
      </Card>
    )
  );
};
