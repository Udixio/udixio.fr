"use client";
import React, { useEffect, useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";

import { classNames } from "@udixio/ui-react";

import { updateThemeFromHex } from "@/components/ThemeProvider";

export type StickyScrollItem = {
  title: string | React.ReactNode;
  description: string | React.ReactNode;
  content?: React.ReactNode;
  media?: React.ReactNode;
  imageSrc?: string;
  imageAlt?: string;
  themeColorHex?: string;
};

export const StickyScroll = ({ items }: { items: StickyScrollItem[] }) => {
  const content = items.map((item) => ({
    text: (
      <>
        {typeof item.title === "string" ? (
          <h4 className="text-headline-medium text-primary">{item.title}</h4>
        ) : (
          item.title
        )}
        {typeof item.description === "string" ? (
          <p className="lg:mt-6 mt-2 text-body-large">{item.description}</p>
        ) : (
          item.description
        )}
        {item.content && <div className="mt-8">{item.content}</div>}
      </>
    ),
    media: item.media ? (
      item.media
    ) : (
      <img
        className="w-full md:h-[320px] h-[200px] lg:h-full object-cover"
        src={item.imageSrc}
        alt={
          item.imageAlt ?? (typeof item.title === "string" ? item.title : "")
        }
        loading="lazy"
      />
    ),
  }));

  const [isLg, setIsLg] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const initialIsLg = window.innerWidth > 1024;
      setIsLg(initialIsLg);

      const handleResize = () => {
        setIsLg(window.innerWidth > 1024);
      };

      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }
  }, []);

  const [activeCard, setActiveCard] = React.useState<number | null>(null);
  const ref = useRef<any>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start center", "end center"],
  });
  const cardLength = content.length;
  const [displayText, setDisplayText] = useState(false);
  const [isOverlay, setIsOverlay] = useState(false);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    setIsOverlay(latest > 0 && latest < 1);
    if (!isLg) return;
    const cardsBreakpoints = content.map((_, index) => index / cardLength);
    let closestBreakpointIndex = 0;
    for (let i = 0; i < cardsBreakpoints.length; i += 1) {
      if (cardsBreakpoints[i] > latest) {
        break;
      }
      closestBreakpointIndex = i;
    }
    setDisplayText(latest > 0);

    if (activeCard !== closestBreakpointIndex) {
      setActiveCard(closestBreakpointIndex);
      const newColor = items[closestBreakpointIndex]?.themeColorHex;
      if (newColor !== undefined) {
        updateThemeFromHex(newColor);
      }
    }
  });

  return (
    <>
      <motion.div className={"flex relative  rounded-md z-20 "} ref={ref}>
        <motion.div
          variants={{
            hidden: { opacity: 0, marginLeft: "-400px", filter: "blur(10px)" },
            visible: { opacity: 1, marginLeft: "0%", filter: "blur(0px)" },
          }}
          initial={isLg ? "hidden" : "visible"}
          transition={{ duration: 0.75, ease: [0.1, 0.25, 0.3, 1] }}
          animate={displayText || !isLg ? "visible" : "hidden"}
          layout
          className={
            "div mask-inverse left lg:w-[400px] w-full relative flex flex-col lg:gap-32 gap-16 "
          }
        >
          {content.map((item, index) => (
            <div
              key={index}
              className={
                "max-w-lg lg:max-w-full " + (index == 1 ? "self-end" : "")
              }
            >
              {!isLg && (
                <div className={classNames("rounded-2xl mb-4 overflow-hidden")}>
                  {item.media}
                </div>
              )}
              <motion.div
                variants={{
                  hidden: {
                    opacity: 0,
                    x: "-400px",
                    filter: "blur(10px)",
                    transition: { x: { delay: 1 }, filter: { delay: 1 } },
                  },
                  visible: { opacity: 1, x: "0%", filter: "blur(0px)" },
                }}
                initial={isLg ? "hidden" : "visible"}
                transition={{ duration: 0.4, ease: [0.1, 0.2, 0.4, 1] }}
                animate={activeCard == index || !isLg ? "visible" : "hidden"}
                className={"lg:my-40 "}
              >
                {item.text}
              </motion.div>
            </div>
          ))}
        </motion.div>

        {isLg && (
          <motion.div
            layout
            variants={{
              hidden: { x: "0%" },
              visible: { x: "0%", marginLeft: "4rem" },
            }}
            initial="hidden"
            animate={displayText ? "visible" : "hidden"}
            className={classNames(
              "right hidden lg:flex flex-2 items-start rounded-md",
            )}
            transition={{ duration: 0.75, ease: [0.1, 0.25, 0.3, 1] }}
          >
            <motion.div
              layout
              layoutRoot
              style={{ top: "calc(50% - " + 500 / 2 + "px)", minWidth: "100%" }}
              variants={{
                hidden: { maxHeight: "auto" },
                visible: { maxHeight: 500 },
              }}
              initial="hidden"
              animate={displayText ? "visible" : "hidden"}
              className={"rounded-2xl sticky overflow-hidden"}
              transition={{ duration: 0.75 }}
            >
              {content.map((card, index) => (
                <motion.div
                  key={index}
                  layout
                  variants={{
                    hidden: {
                      opacity: "0",
                      visibility: "hidden",
                      transitionEnd: { display: "none" },
                    },
                    visible: {
                      opacity: "1",
                      visibility: "visible",
                      transitionEnd: { display: "block" },
                    },
                  }}
                  className={classNames("w-full h-[500px]", {
                    "!block":
                      index == activeCard || (activeCard == null && index == 0),
                  })}
                  initial="hidden"
                  animate={
                    index == activeCard || (activeCard == null && index == 0)
                      ? "visible"
                      : "hidden"
                  }
                  transition={{ duration: 0 }}
                >
                  {card.media}
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </>
  );
};
