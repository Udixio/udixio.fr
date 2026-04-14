import { iComment } from "@udixio/icons-rounded-400/comment";
import { Fab } from "@udixio/ui-react";
import { useEffect, useRef, useState } from "react";

export const Header = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [fabIsHovered, setFabIsHovered] = useState(false);
  const isExpandedRef = useRef(true);
  const previousScrollPosition = useRef<number | null>(null);
  const hideMenuScrollPosition = useRef(0);
  const showMenuScrollPosition = useRef(0);
  const tickingRef = useRef(false);

  useEffect(() => {
    isExpandedRef.current = isExpanded;
  }, [isExpanded]);

  useEffect(() => {
    const update = (currentScrollPosition: number) => {
      if (previousScrollPosition.current === null) {
        previousScrollPosition.current = currentScrollPosition;
        setIsExpanded(currentScrollPosition === 0);
        return;
      }

      if (currentScrollPosition > previousScrollPosition.current) {
        showMenuScrollPosition.current = currentScrollPosition - 75;
      }

      if (currentScrollPosition < previousScrollPosition.current) {
        hideMenuScrollPosition.current = currentScrollPosition + 200;
      }

      if (!isExpandedRef.current || currentScrollPosition === 0) {
        if (currentScrollPosition <= showMenuScrollPosition.current) {
          setIsExpanded(true);
        }
      } else if (currentScrollPosition >= hideMenuScrollPosition.current) {
        setIsExpanded(false);
      }

      previousScrollPosition.current = currentScrollPosition;
    };

    const onScroll = () => {
      if (tickingRef.current) return;

      tickingRef.current = true;

      requestAnimationFrame(() => {
        update(window.scrollY || document.documentElement.scrollTop || 0);
        tickingRef.current = false;
      });
    };

    update(window.scrollY || document.documentElement.scrollTop || 0);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <Fab
      variant="tertiaryContainer"
      onMouseEnter={() => setFabIsHovered(true)}
      onMouseLeave={() => setFabIsHovered(false)}
      title="Contacter Joël VIGREUX"
      icon={iComment}
      id="button-contact"
      href="/contact"
      label="Contactez-nous"
      className="!fixed bottom-8 right-8 z-50"
      extended={isExpanded || fabIsHovered}
    />
  );
};
