import { Button, Card, classNames, RippleEffect } from "@udixio/ui-react";
import React, { useEffect, useLayoutEffect, useRef, useState, Activity } from "react";

type MenuItemType = {
  label: string;
  href?: string;
  subItems?: { label: string; href: string }[];
};

const MENU_ITEMS: MenuItemType[] = [
  { label: "Accueil", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Réalisations", href: "/realisations" },
  { label: "Blog", href: "/blog" },
  {
    label: "L'agence",
    href: "#", // Add a dummy href to allow for mobile tap / link feeling
    subItems: [
      { label: "L'équipe", href: "/agence" },
      { label: "Notre méthode", href: "/methode" },
    ],
  },
  { label: "Contact", href: "/contact" },
];

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
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({
    left: 0,
    width: 20,
    opacity: 0,
  });

  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const anchorRefs = useRef<
    Record<string, { current: HTMLAnchorElement | null }>
  >({});

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

  // Handle clicking outside to close mobile dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const checkIsSelected = (href?: string) => {
    if (!href) return false;
    return pathName === href || (href !== "/" && pathName?.startsWith(href));
  };

  useLayoutEffect(() => {
    const updateIndicator = () => {
      let targetLabel = hoveredLabel;

      let selectedLabel: string | undefined = undefined;
      const selectedItem = MENU_ITEMS.find((item) => {
        const isDropdown = !!item.subItems;
        return isDropdown
          ? item.subItems!.some((sub) => checkIsSelected(sub.href))
          : checkIsSelected(item.href);
      });
      if (selectedItem) selectedLabel = selectedItem.label;

      if (!targetLabel) {
        targetLabel = selectedLabel || null;
      }

      const itemEl = targetLabel ? itemRefs.current[targetLabel] : null;
      const navEl = menuRef.current;

      if (itemEl && navEl) {
        const itemRect = itemEl.getBoundingClientRect();
        const navRect = navEl.getBoundingClientRect();

        let indicatorWidth;
        if (targetLabel === selectedLabel) {
          indicatorWidth = 24; // Small width when on active item
        } else {
          indicatorWidth = Math.max(itemRect.width - 32, 24); // Full width minus padding when hovered
        }

        setIndicatorStyle({
          left:
            itemRect.left -
            navRect.left +
            navEl.scrollLeft +
            itemRect.width / 2 -
            indicatorWidth / 2,
          width: indicatorWidth,
          opacity: 1,
        });
      } else {
        setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
      }
    };

    updateIndicator();

    // Re-calculate after short delay to let CSS transitions settle
    const timeout = setTimeout(updateIndicator, 300);

    window.addEventListener("resize", updateIndicator);
    return () => {
      window.removeEventListener("resize", updateIndicator);
      clearTimeout(timeout);
    };
  }, [hoveredLabel, pathName, isScrolled]);

  if (pathName === null) return null;

  return (
    <Card
      variant={"filled"}
      className={classNames(
        "max-w-full rounded-full flex transition-all duration-500 ease-in-out z-50 mx-2 overflow-visible",
        {
          "bg-transparent backdrop-blur-none rounded-none": !isScrolled,
          "bg-surface-container-lowest/80 backdrop-blur-md shadow-md border border-outline-variant/20":
            isScrolled,
        },
        { "opacity-0": !isVisible },
      )}
    >
      <nav
        ref={menuRef}
        className={classNames(
          "relative flex items-stretch overflow-x-auto md:overflow-visible transition-all hide-scrollbar",
          !isScrolled ? "gap-2" : "gap-0 px-2",
        )}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }} // extra hide scrollbar
        onMouseLeave={() => setHoveredLabel(null)}
      >
        {/* Animated Sliding Underline Indicator */}
        <span
          className="absolute bottom-1 h-[3px] rounded-full bg-primary z-0"
          style={{
            left: `${indicatorStyle.left}px`,
            width: `${indicatorStyle.width}px`,
            opacity: indicatorStyle.opacity,
            transition: "all 300ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />

        {MENU_ITEMS.map((item) => {
          const isDropdown = !!item.subItems;
          const isSelected = isDropdown
            ? item.subItems!.some((sub) => checkIsSelected(sub.href))
            : checkIsSelected(item.href);

          return (
            <div
              key={item.label}
              ref={(el) => {
                itemRefs.current[item.label] = el;
              }}
              className={classNames(
                "relative flex items-center group z-10",
                { "md:hidden block": item.href === "/contact" }, // contact condition
              )}
              onMouseEnter={() => {
                setHoveredLabel(item.label);
                if (isDropdown) setOpenDropdown(item.label);
              }}
              onMouseLeave={() => {
                if (isDropdown) setOpenDropdown(null);
              }}
            >
              <a
                ref={(el) => {
                  if (!anchorRefs.current[item.label]) {
                    anchorRefs.current[item.label] = { current: null };
                  }
                  anchorRefs.current[item.label].current = el;
                }}
                href={item.href || "#"}
                onClick={(e) => {
                  if (item.href === "#" || isDropdown) {
                    e.preventDefault();
                    setOpenDropdown(
                      openDropdown === item.label ? null : item.label,
                    );
                  }
                }}
                className={classNames(
                  "relative px-4 outline-none transition-all duration-300 rounded-full flex items-center justify-center gap-1 flex-nowrap whitespace-nowrap overflow-hidden leading-none",
                  isScrolled ? "text-label-small py-3" : "text-label-medium py-4",
                  isSelected
                    ? "text-primary"
                    : "text-on-surface hover:text-primary",
                )}
              >
                {anchorRefs.current[item.label] && (
                  <RippleEffect
                    triggerRef={anchorRefs.current[item.label]}
                    colorName={isSelected ? "primary" : "on-surface"}
                  />
                )}

                <span className="relative z-10 flex items-center gap-1">
                  {item.label}

                  {/* Dropdown Chevron */}
                  {isDropdown && (
                    <svg
                      className={classNames(
                        "w-4 h-4 transition-transform duration-300 flex-shrink-0",
                        openDropdown === item.label ? "rotate-180" : "",
                      )}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  )}
                </span>
              </a>

              {/* Sub-menu Dropdown */}
              {isDropdown && (
                <Activity mode={openDropdown === item.label ? "visible" : "hidden"}>
                  <div
                    className={classNames(
                      "absolute top-[90%] md:top-full left-0 md:left-1/2 md:-translate-x-1/2 pt-2 md:pt-4 transition-all duration-300 ease-out z-50",
                      openDropdown === item.label
                        ? "opacity-100 translate-y-0 pointer-events-auto"
                        : "opacity-0 -translate-y-2 pointer-events-none",
                    )}
                  >
                    <div className="flex flex-col bg-surface-container-low backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden min-w-[220px] border border-outline-variant/20">
                      {item.subItems!.map((subItem) => {
                        const isSubSelected = checkIsSelected(subItem.href);
                        return (
                          <a
                            key={subItem.href}
                            href={subItem.href}
                            className={classNames(
                              "px-5 py-3 text-sm font-medium transition-colors outline-none",
                              isSubSelected
                                ? "text-primary bg-surface-container"
                                : "text-on-surface hover:bg-surface-container-high hover:text-primary focus:bg-surface-container-high",
                            )}
                            onClick={() => setOpenDropdown(null)}
                          >
                            {subItem.label}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                </Activity>
              )}
            </div>
          );
        })}
      </nav>

      {isScrolled && (
        <Button
          size={"small"}
          allowShapeTransformation={false}
          href={"/contact"}
          className={classNames(
            "m-2 hidden md:flex items-center transition-all shadow-md hover:shadow-lg",
            !isScrolled ? "bg-primary text-on-primary" : "",
          )}
          label={"Contact"}
        />
      )}
    </Card>
  );
};
