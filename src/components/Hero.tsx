import {Logo} from "@components/Logo.tsx"
import {motion, useMotionValue} from "motion/react";
import {type ReactNode, useEffect, useRef, useState} from "react";
import {SectionPadding} from "@components/SectionPadding.tsx";
import {Menu} from "@components/Menu.tsx";
import {createPortal} from "react-dom";

// -- Repulsive Shape Component --
// Helper to create a smooth closed path from points (Catmull-Rom to Cubic Bezier)
// Helper removed (simpler CSS approach)

const RepulsiveShape = ({shape}: {
    shape: {
        id: number;
        width: string;
        height: string;
        top: string;
        left: string;
        background: string;
        borderRadius: string[];
        duration: number;
    };
}) => {
    // Pure CSS/Motion Optimized Version
    // We animate 'borderRadius' which is GPU accelerated in modern browsers or at least very cheap paint-wise compared to JS path calculation.
    // We also rotate slightly to simulate fluidity.

    return (
        <motion.div
            className={`absolute ${shape.background} opacity-90`}
            style={{
                width: shape.width,
                height: shape.height,
                top: shape.top,
                left: shape.left,
                filter: "drop-shadow(0px 10px 20px rgba(0,0,0,0.1))"
            }}
            initial={{
                borderRadius: shape.borderRadius[0],
                rotate: Math.random() * 360
            }}
            animate={{
                // Cycle through the pre-generated random shapes
                borderRadius: shape.borderRadius,
                // Slow rotation adds to the liquid feel
                rotate: 360,
                // Subtle float
                y: [0, -15, 0],
            }}
            transition={{
                borderRadius: {
                    duration: shape.duration * 2, // Slower morph
                    repeat: Infinity,
                    repeatType: "mirror", // Prevents the hard reset (YoYo effect)
                    ease: "easeInOut"
                },
                rotate: {
                    duration: shape.duration * 15, // Extremely slow rotation
                    repeat: Infinity,
                    ease: "linear"
                },
                y: {
                    duration: shape.duration * 3, // Very slow breathing float
                    repeat: Infinity,
                    ease: "easeInOut"
                }
            }}
        />
    );
};

export const Hero = ({children}: { children?: ReactNode }) => {

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
        if (typeof window !== 'undefined') {
            mouseXPx.set(window.innerWidth / 2);
            mouseYPx.set(window.innerHeight / 2);
        }

        if (typeof window !== 'undefined' && window.matchMedia("(pointer: fine)").matches) {
            window.addEventListener("mousemove", handleMouseMove);
        }
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    // Removed smoothX and smoothY as mouse tracking is removed
    // const smoothX = useSpring(mouseX, {stiffness: 30, damping: 30});
    // const smoothY = useSpring(mouseY, {stiffness: 30, damping: 30});


    // -- Random Shapes Logic --
    const [shapes, setShapes] = useState<Array<{
        id: number;
        width: string;
        height: string;
        top: string;
        left: string;
        background: string;
        borderRadius: string[];
        duration: number;
    }>>([]);

    useEffect(() => {
        // Helper to generate extreme organic blob shapes (8 values)
        // High variance = "Paint Blot" / "Roughness"
        const r = () => Math.floor(Math.random() * 60 + 20); // 20% to 80% range (Extreme irregularity)
        const genBlob = () => `${r()}% ${r()}% ${r()}% ${r()}% / ${r()}% ${r()}% ${r()}% ${r()}%`;

        // Generate random shapes on client-side only
        // Forced to edges: Centered on the edge + small offset
        const newShapes = Array.from({length: 5}).map((_, i) => {
            // Generate size first (numeric vh)
            // Generate size first (numeric vh) - Reduced to 30-70vh
            const w = Math.random() * 40 + 30;
            const h = Math.random() * 40 + 30;

            let top, left;

            // 1: Right, 2: Bottom, 3: Left (No Top)
            const side = Math.floor(Math.random() * 3) + 1;

            // Offset from the exact edge center (in vh). Positive = Shift Into Screen, Negative = Shift Out
            // We want roughly -5 to +10vh to ensure it touches but is mostly visible
            const edgeOffset = () => Math.random() * 10 - 2;

            // Random position along the perpendicular axis (in vw/vh) - Restricted to bottom 60-100%
            const randomAxis = () => Math.random() * 40 + 60;

            if (side === 1) { // Right
                // Center is at 100% x.
                left = `calc(100% - ${w / 2}vh - ${edgeOffset()}vh)`; // Minus offset to pull left (into screen)
                top = `calc(${randomAxis()}% - ${h / 2}vh)`;
            } else if (side === 2) { // Bottom
                // Center at 100% y.
                top = `calc(100% - ${h / 2}vh - ${edgeOffset()}vh)`; // Minus to pull up
                left = `calc(${randomAxis()}% - ${w / 2}vh)`;
            } else { // Left
                // Center at 0% x.
                left = `calc(0% - ${w / 2}vh + ${edgeOffset()}vh)`;
                top = `calc(${randomAxis()}% - ${h / 2}vh)`;
            }

            return {
                id: i,
                width: `${w}vh`,
                height: `${h}vh`,
                top,
                left,
                background: i % 2 === 0 ? "bg-secondary-container/80" : "bg-tertiary-container/80",
                // Generate 5 distinct morph states per shape for fluid irregularity
                // This array will be cycled through by Framer Motion in RepulsiveShape
                borderRadius: [
                    genBlob(),
                    genBlob(),
                    genBlob(),
                    genBlob(),
                    genBlob()
                ],
                duration: 5 + Math.random() * 5,
            };
        });
        setShapes(newShapes);
    }, []);


    return <SectionPadding end as="section" onClose={() => setIsMenuFixed(true)} onOpen={() => setIsMenuFixed(false)}
    >
        <div
            ref={heroRef}
            className="relative min-h-screen flex flex-col items-center justify-center bg-surface-container-low text-on-surface overflow-hidden h-full pt-16">

            {/* --- PAPER TEXTURE OVERLAY --- */}
            <div className="absolute inset-0 z-10 pointer-events-none  opacity-40">
                <svg className="w-full h-full">
                    <filter id="paperNoise">
                        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/>
                        <feColorMatrix type="saturate" values="0"/>
                    </filter>
                    <rect width="100%" height="100%" filter="url(#paperNoise)"/>
                </svg>
            </div>

            {/* --- BACKGROUND LAYERS --- */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">

                {/* LAYER 1: SOFT ORGANIC "PAPER" SHAPES */}
                <div className="absolute inset-0 z-0">
                    {shapes.map((shape) => (
                        <RepulsiveShape
                            key={shape.id}
                            shape={shape}
                        />
                    ))}
                </div>
            </div>

            {/* HEADER / LOGO - Top Left */}
            <div className="absolute top-6 left-6 md:left-12 z-50 pointer-events-none">
                <div className="p-2 md:p-0">
                    <Logo className="fill-on-surface h-8 w-auto"/>
                </div>
            </div>

            {/* MENU - Static position initially, then fixed */}
            {
                !isMenuFixed && <motion.div
                    layoutId="main-menu"
                    className={"absolute top-0 mx-auto left-0 right-0 w-fit mt-4 z-40"}
                >
                    <Menu isScrolled={false} fabVisible={fabVisible} setFabVisible={setFabVisible}/>
                </motion.div>

            }
            {
                isMenuFixed && createPortal(
                    <motion.div
                        layoutId="main-menu"
                        className={"fixed top-0 mx-auto left-0 right-0 w-fit mt-4 z-50"}
                    >
                        <Menu isScrolled={true} fabVisible={fabVisible} setFabVisible={setFabVisible}/>
                    </motion.div>,
                    document.body
                )
            }


            {/* CENTERED AGENCY CONTENT */}
            <div
                className="relative w-full section z-20">

                {children}


            </div>

        </div>


    </SectionPadding>


}
