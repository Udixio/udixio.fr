import { Logo } from "@components/Logo.tsx";
import { motion, useMotionValue } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { SectionPadding } from "@components/SectionPadding.tsx";
import { Menu } from "@components/Menu.tsx";
import { createPortal } from "react-dom";
import { classNames } from "@udixio/ui-react"; // -- UI Wireframe Shape Component --

// -- UI Wireframe Shape Component --
// Abstract shapes that evoke web UI components (cards, navbars, pills, circles)
// without being literal screenshots — stays graphic/modern while signaling craft

type UIShapeVariant = "card" | "navbar" | "pill" | "circle";

interface UIShape {
  id: number;
  variant: UIShapeVariant;
  width: string;
  height: string;
  top: string;
  left: string;
  borderRadius: string;
  colorClass: string;
  opacity: number;
  rotate: number;
  floatY: number;
  duration: number;
  delay: number;
}

const UIWireframeShape = ({ shape }: { shape: UIShape }) => {
  const innerContent = () => {
    if (shape.variant === "card") {
      return (
        <div className="p-[12%] h-full flex flex-col gap-[8%]">
          {/* Simulated header bar */}
          <div className="w-full h-[10%] rounded-md bg-current opacity-20" />
          {/* Text lines */}
          <div className="w-3/4 h-[7%] rounded bg-current opacity-10" />
          <div className="w-1/2 h-[7%] rounded bg-current opacity-10" />
          {/* Bottom pill (CTA) */}
          <div className="mt-auto w-2/5 h-[10%] rounded-full bg-current opacity-15" />
        </div>
      );
    }
    if (shape.variant === "navbar") {
      return (
        <div className="flex items-center gap-3 h-full px-4">
          <div className="w-3 h-3 rounded-full bg-current opacity-30 shrink-0" />
          <div className="w-10 h-[30%] rounded bg-current opacity-15" />
          <div className="w-10 h-[30%] rounded bg-current opacity-15" />
          <div className="w-10 h-[30%] rounded bg-current opacity-15" />
          <div className="ml-auto w-8 h-[50%] rounded-full bg-current opacity-20" />
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      className={`absolute border overflow-hidden ${shape.colorClass}`}
      style={{
        width: shape.width,
        height: shape.height,
        top: shape.top,
        left: shape.left,
        borderRadius: shape.borderRadius,
        rotate: shape.rotate,
      }}
      initial={{ opacity: 0 }}
      animate={{
        opacity: [shape.opacity * 0.5, shape.opacity, shape.opacity * 0.5],
        y: [0, -shape.floatY, 0],
        rotate: [shape.rotate - 0.8, shape.rotate + 0.8, shape.rotate - 0.8],
      }}
      transition={{
        duration: shape.duration,
        repeat: Infinity,
        ease: "easeInOut",
        delay: shape.delay,
      }}
    >
      {innerContent()}
    </motion.div>
  );
};

export const Hero = ({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) => {
  const [isMenuFixed, setIsMenuFixed] = useState(false);
  const [fabVisible, setFabVisible] = useState(true);

  // Reference to the main hero container/canvas
  const heroRef = useRef<HTMLDivElement>(null);

  // -- Parallax Logic (Architectural) --
  // -- Repulsion & Mask Logic --
  const mouseXPx = useMotionValue(0);
  const mouseYPx = useMotionValue(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Pixel values for mask
      mouseXPx.set(e.clientX);
      mouseYPx.set(e.clientY);
    };

    // Init center pos
    if (typeof window !== "undefined") {
      mouseXPx.set(window.innerWidth / 2);
      mouseYPx.set(window.innerHeight / 2);
    }

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: fine)").matches
    ) {
      window.addEventListener("mousemove", handleMouseMove);
    }
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Removed smoothX and smoothY as mouse tracking is removed
  // const smoothX = useSpring(mouseX, {stiffness: 30, damping: 30});
  // const smoothY = useSpring(mouseY, {stiffness: 30, damping: 30});

  // -- UI Wireframe Shapes Logic --
  const [shapes, setShapes] = useState<UIShape[]>([]);

  useEffect(() => {
    const rand = (min: number, max: number) =>
      Math.random() * (max - min) + min;

    type ShapeConfig = {
      variant: UIShapeVariant;
      wVh: [number, number];
      hVh: [number, number];
      borderRadius: string;
      colorClass: string;
      positionFn: (w: number, h: number) => { top: string; left: string };
    };

    const configs: ShapeConfig[] = [
      // Card (primary tint) — right side, lower half
      {
        variant: "card",
        wVh: [22, 30],
        hVh: [22, 30],
        borderRadius: "20px",
        colorClass: "border-primary/20 bg-primary/[0.04] text-primary",
        positionFn: (w, h) => ({
          top: `calc(${rand(50, 75)}% - ${h / 2}vh)`,
          left: `calc(100% - ${w * 0.75}vh)`,
        }),
      },
      // Navbar — top area, slightly offset
      {
        variant: "navbar",
        wVh: [32, 44],
        hVh: [4, 6],
        borderRadius: "12px",
        colorClass:
          "border-outline-variant/30 bg-surface/50 text-on-surface-variant",
        positionFn: (w, h) => ({
          top: `calc(${rand(12, 28)}% - ${h / 2}vh)`,
          left: `calc(${rand(25, 55)}% - ${w / 2}vh)`,
        }),
      },
      // Pill / Badge — right side middle
      {
        variant: "pill",
        wVh: [10, 16],
        hVh: [3.5, 5],
        borderRadius: "100px",
        colorClass: "border-tertiary/30 bg-tertiary/[0.06] text-tertiary",
        positionFn: (w, h) => ({
          top: `calc(${rand(38, 62)}% - ${h / 2}vh)`,
          left: `calc(100% - ${w * 0.6}vh)`,
        }),
      },
      // Card (neutral) — left side, lower half
      {
        variant: "card",
        wVh: [18, 26],
        hVh: [18, 26],
        borderRadius: "16px",
        colorClass:
          "border-outline-variant/35 bg-surface-container/40 text-on-surface-variant",
        positionFn: (w, h) => ({
          top: `calc(${rand(55, 80)}% - ${h / 2}vh)`,
          left: `calc(0% - ${w * 0.35}vh)`,
        }),
      },
      // Circle — bottom-right floating
      {
        variant: "circle",
        wVh: [7, 11],
        hVh: [7, 11],
        borderRadius: "50%",
        colorClass: "border-secondary/25 bg-secondary/[0.06] text-secondary",
        positionFn: (w, h) => ({
          top: `calc(${rand(62, 82)}% - ${h / 2}vh)`,
          left: `calc(${rand(58, 78)}% - ${w / 2}vh)`,
        }),
      },
    ];

    const newShapes: UIShape[] = configs.map((config, i) => {
      const w = rand(config.wVh[0], config.wVh[1]);
      const h = rand(config.hVh[0], config.hVh[1]);
      const pos = config.positionFn(w, h);
      return {
        id: i,
        variant: config.variant,
        width: `${w}vh`,
        height: `${h}vh`,
        ...pos,
        borderRadius: config.borderRadius,
        colorClass: config.colorClass,
        opacity: rand(0.4, 0.65),
        rotate: rand(-4, 4),
        floatY: rand(8, 16),
        duration: rand(7, 13),
        delay: rand(0, 3),
      };
    });
    setShapes(newShapes);
  }, []);

  return (
    <SectionPadding
      end
      as="section"
      onClose={() => setIsMenuFixed(true)}
      onOpen={() => setIsMenuFixed(false)}
    >
      <div
        ref={heroRef}
        className="relative min-h-screen flex  items-center justify-center bg-surface-container-low text-on-surface overflow-hidden h-full pt-16"
      >
        {/* --- PAPER TEXTURE OVERLAY --- */}
        <div className="absolute inset-0 z-10 pointer-events-none  opacity-40">
          <svg className="w-full h-full">
            <filter id="paperNoise">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.8"
                numOctaves="3"
                stitchTiles="stitch"
              />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#paperNoise)" />
          </svg>
        </div>

        {/* HEADER / LOGO - Top Left */}
        <div className="absolute h-fit top-6 inset-0 mx-auto  z-50 pointer-events-none max-width padding-x flex justify-between ">
          <Logo className="fill-on-surface h-8 w-auto" />
          <div className={"pointer-events-auto"}>
            {/* MENU - Static position initially, then fixed */}
            {!isMenuFixed && (
              <motion.div layoutId="main-menu" className={" w-fit "}>
                <Menu
                  isScrolled={false}
                  fabVisible={fabVisible}
                  setFabVisible={setFabVisible}
                />
              </motion.div>
            )}
          </div>
        </div>

        {isMenuFixed &&
          createPortal(
            <motion.div
              layoutId="main-menu"
              className={"fixed top-0 mx-auto left-0 right-0 w-fit mt-4 z-50"}
            >
              <Menu
                isScrolled={true}
                fabVisible={fabVisible}
                setFabVisible={setFabVisible}
              />
            </motion.div>,
            document.body,
          )}

        {/* CENTERED AGENCY CONTENT */}
        <div className={classNames("relative w-full section z-20", className)}>
          {children}
        </div>
      </div>
    </SectionPadding>
  );
};
