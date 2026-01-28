import {Logo} from "@components/Logo.tsx"
import {motion, type MotionValue, useAnimationFrame, useMotionTemplate, useMotionValue, useSpring} from "motion/react";
import {type ReactNode, useEffect, useRef, useState} from "react";
import {SectionPadding} from "@components/SectionPadding.tsx";
import {Menu} from "@components/Menu.tsx";
import {createPortal} from "react-dom";

// -- Repulsive Shape Component --
// -- Repulsive Shape Component --
// Helper to create a smooth closed path from points (Catmull-Rom to Cubic Bezier)
function spline(points: { x: number, y: number }[]) {
    const n = points.length;
    let d = "";
    for (let i = 0; i < n; i++) {
        const p0 = points[(i - 1 + n) % n];
        const p1 = points[i];
        const p2 = points[(i + 1) % n];
        const p3 = points[(i + 2) % n];

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;

        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        if (i === 0) d += `M ${p1.x} ${p1.y} `;
        d += `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y} `;
    }
    return d + "Z";
}

// Helper to parse CSS units to pixels
const parseUnit = (value: string, parentSize: number) => {
    const float = parseFloat(value);
    if (value.includes('%')) return (float / 100) * parentSize;
    if (value.includes('vh')) return (float / 100) * (typeof window !== 'undefined' ? window.innerHeight : parentSize);
    if (value.includes('vw')) return (float / 100) * (typeof window !== 'undefined' ? window.innerWidth : parentSize);
    return float; // assume px
};

const RepulsiveShape = ({
                            shape,
                            mouseX,
                            mouseY,
                            parentRef
                        }: {
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
    mouseY: MotionValue<number>;
    parentRef: React.RefObject<HTMLElement | null>;
}) => {
    const uniqueId = `blob-${shape.id}`;
    const clipPathRef = useRef<SVGPathElement>(null);
    const inited = useRef(false);

    // Physics state (Absolute Pixel Coordinates)
    const x = useMotionValue(-1000); // Start off-screen until inited
    const y = useMotionValue(-1000);
    const velocity = useRef({x: 0, y: 0});

    // Internal State
    const radiusRef = useRef(50);

    // Blob Vertices State
    // Randomize complexity per shape
    const minPoints = 5;
    const maxPoints = 18;
    // We use a ref for points to persist between renders
    const pointsRef = useRef<{
        angle: number;
        baseAmp: number;
        ampSpeed: number;
        ampPhase: number;
        waveSpeed: number;
        wavePhase: number;
        baseRadiusOffset: number;
        currentX: number;
        currentY: number;
    }[]>([]);

    // Initialize points once
    useEffect(() => {
        const numPoints = Math.floor(Math.random() * (maxPoints - minPoints + 1)) + minPoints;
        pointsRef.current = Array.from({length: numPoints}).map((_, i) => ({
            angle: (Math.PI * 2 * i) / numPoints,
            baseAmp: 5 + Math.random() * 10,
            ampSpeed: 0.0002 + Math.random() * 0.0004,
            ampPhase: Math.random() * 10,
            waveSpeed: 0.0002 + Math.random() * 0.0004,
            wavePhase: Math.random() * 10,
            baseRadiusOffset: -10 + Math.random() * 25,
            currentX: 0,
            currentY: 0
        }));
    }, []);

    // Initialize Position & Size from Props -> Pixels
    useEffect(() => {
        if (!parentRef.current) return;
        const parent = parentRef.current;
        const rect = parent.getBoundingClientRect();

        const initX = parseUnit(shape.left, rect.width);
        const initY = parseUnit(shape.top, rect.height);
        const size = parseUnit(shape.width, rect.height); // Using height as ref for vh-based sizes mostly

        x.set(initX);
        y.set(initY);
        radiusRef.current = size / 2;
        inited.current = true;
    }, [shape, parentRef]);

    useAnimationFrame((time) => {
        if (!clipPathRef.current || !parentRef.current || !inited.current) return;

        // --- 1. GLOBAL DRIFT PHYSICS (Absolute) ---
        const mx = mouseX.get();
        const my = mouseY.get();

        // Center position (current physics state)
        const cx = x.get();
        const cy = y.get();

        const dx = mx - cx;
        const dy = my - cy;
        const distToMouse = Math.sqrt(dx * dx + dy * dy);
        const driftRadius = 600;

        // Drift logic is now reactive driven by vertex stress, not proactive.
        // We accumulate the "Stress" (forces applied to vertices) to push the whole body.
        let internalStressX = 0;
        let internalStressY = 0;

        const margin = 0;
        const rect = parentRef.current.getBoundingClientRect();
        const vw = rect.width;
        const vh = rect.height;
        const wallForce = 0.8;

        if (cx < margin) {
            velocity.current.x += wallForce;
            velocity.current.x *= 0.8;
        }
        if (cx > vw - margin) {
            velocity.current.x -= wallForce;
            velocity.current.x *= 0.8;
        }
        if (cy < margin) {
            velocity.current.y += wallForce;
            velocity.current.y *= 0.8;
        }
        if (cy > vh - margin) {
            velocity.current.y -= wallForce;
            velocity.current.y *= 0.8;
        }

        velocity.current.x *= 0.94;
        velocity.current.y *= 0.94;

        const newX = cx + velocity.current.x;
        const newY = cy + velocity.current.y;
        x.set(newX);
        y.set(newY);


        // --- 2. VERTEX DEFORMATION ---
        // Mouse relative to Shape Center
        const dxCenter = mx - newX;
        const dyCenter = my - newY;
        const distCenter = Math.sqrt(dxCenter * dxCenter + dyCenter * dyCenter);

        // Volume reaction
        const pressExpansion = Math.max(0, (120 - distCenter) * 0.25);

        const renderPoints = pointsRef.current.map((pt, i) => {
            const t = time;

            // Amplitude Modulation
            const lifeFactor = Math.sin(t * pt.ampSpeed + pt.ampPhase) * 0.6 + 0.9;
            const currentAmp = pt.baseAmp * lifeFactor;

            // Traveling Wave
            const phase = t * pt.waveSpeed + pt.wavePhase;
            const noise =
                Math.sin(phase) * currentAmp +
                Math.cos(phase * 0.7 + i) * (currentAmp * 0.5);

            const r = radiusRef.current + pt.baseRadiusOffset + noise + pressExpansion;

            // Absolute Vertex Position
            let px = newX + Math.cos(pt.angle) * r;
            let py = newY + Math.sin(pt.angle) * r;

            // Interaction
            const vecX = px - mx;
            const vecY = py - my;
            const pointDist = Math.sqrt(vecX * vecX + vecY * vecY);
            const pointInteractionRadius = 100; // Hard collider

            if (pointDist < pointInteractionRadius) {
                const angleToPoint = Math.atan2(vecY, vecX);

                // New position on the circumference
                const solvedPx = mx + Math.cos(angleToPoint) * pointInteractionRadius;
                const solvedPy = my + Math.sin(angleToPoint) * pointInteractionRadius;

                // Calculate Displacement (Stress)
                const displacementX = solvedPx - px;
                const displacementY = solvedPy - py;

                // Accumulate stress to push the main body later
                // We weight it slightly so 1 point moving doesn't shove the whole huge shape instantly
                internalStressX += displacementX;
                internalStressY += displacementY;

                px = solvedPx;
                py = solvedPy;
            }

            return {x: px, y: py};
        });

        // --- 3. APPLY REACTIVE PHYSICS ---
        // If vertices were deformed, push the body
        // Threshold set high (40) so the shape dents SIGNIFICANTLY before moving (Heavy inertia)
        if (Math.abs(internalStressX) > 40 || Math.abs(internalStressY) > 40) {
            // Move body to relieve stress
            const reliefFactor = 0.02;
            velocity.current.x += internalStressX * reliefFactor;
            velocity.current.y += internalStressY * reliefFactor;
        }

        clipPathRef.current.setAttribute("d", spline(renderPoints));
    });

    return (
        <div className="absolute inset-0 w-full h-full pointer-events-none">
            {/* Hidden SVG defining the clip path (UserSpaceOnUse = Absolute Pixels) */}
            <svg width="0" height="0" className="absolute">
                <defs>
                    <clipPath id={uniqueId} clipPathUnits="userSpaceOnUse">
                        <path ref={clipPathRef}/>
                    </clipPath>
                </defs>
            </svg>

            {/* Visible Full Screen Div using the User's BG Class + Clip Path */}
            <div
                className={`absolute inset-0 w-full h-full ${shape.background}`}
                style={{
                    clipPath: `url(#${uniqueId})`,
                    // We apply drop-shadow to this layer. Since it's clipped, shadow follows the shape.
                    filter: "drop-shadow(0px 10px 20px rgba(0,0,0,0.15))"
                }}
            />
        </div>
    );
};

export const Hero = ({children}: { children?: ReactNode }) => {

    const [isMenuFixed, setIsMenuFixed] = useState(false);
    const [fabVisible, setFabVisible] = useState(true);

    // Reference to the main hero container/canvas
    const heroRef = useRef<HTMLDivElement>(null);

    // -- Parallax Logic (Architectural) --
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    // -- Repulsion & Mask Logic --
    const mouseXPx = useMotionValue(0);
    const mouseYPx = useMotionValue(0);

    // Grid Mask: visible only around mouse
    const gridMask = useMotionTemplate`radial-gradient(65vmin circle at ${mouseXPx}px ${mouseYPx}px, black, rgba(0,0,0,0.5))`;

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const {innerWidth, innerHeight} = window;
            mouseX.set((e.clientX / innerWidth) - 0.5);
            mouseY.set((e.clientY / innerHeight) - 0.5);

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

    const smoothX = useSpring(mouseX, {stiffness: 30, damping: 30});
    const smoothY = useSpring(mouseY, {stiffness: 30, damping: 30});


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
        const newShapes = Array.from({length: 5}).map((_, i) => ({
            id: i,
            width: `${Math.random() * 50 + 20}vh`, // Much larger range (20vh to 70vh)
            height: `${Math.random() * 50 + 20}vh`,
            top: `${Math.random() * 85}%`,
            left: `${Math.random() * 85}%`,
            background: i % 2 === 0 ? "bg-secondary-container" : "bg-tertiary-container",
            // Generate 5 distinct morph states per shape for fluid irregularity
            borderRadius: [
                genBlob(),
                genBlob(),
                genBlob(),
                genBlob(),
                genBlob() // Cycle back will happen with repeatType mirror
            ],
            duration: Math.random() * 10 + 10,
        }));
        setShapes(newShapes);
    }, []);


    return <SectionPadding end as="section" onClose={() => setIsMenuFixed(true)} onOpen={() => setIsMenuFixed(false)}
    >
        <div
            ref={heroRef}
            className="relative flex flex-col items-center justify-center bg-[#FAFAFA] text-on-surface overflow-hidden min-h-[90vh]  pt-16">

            {/* --- PAPER TEXTURE OVERLAY --- */}
            <div className="absolute inset-0 z-10 pointer-events-none mix-blend-multiply opacity-40">
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
                            mouseX={mouseXPx}
                            mouseY={mouseYPx}
                            parentRef={heroRef}
                        />
                    ))}
                </div>

                {/* LAYER 2: ARCHITECTURAL STRUCTURE (Dominant) */}
                <div className="absolute inset-0">
                    {/* Grid Background with Flashlight Mask */}
                    <motion.div
                        style={{maskImage: gridMask, WebkitMaskImage: gridMask}}
                        className="absolute inset-0 text-outline-variant/50 bg-[linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] bg-[size:40px_40px]">
                    </motion.div>
                </div>
            </div>

            {/* HEADER / LOGO - Top Left */}
            <div className="absolute top-6 left-6 md:left-12 z-50 pointer-events-none">
                <motion.div
                    className="pointer-events-auto"
                    initial={{opacity: 0, x: -20}}
                    animate={{opacity: 1, x: 0}}
                    transition={{duration: 0.8}}
                >
                    <div className="p-2 md:p-0">
                        <Logo className="fill-on-surface h-8 w-auto"/>
                    </div>
                </motion.div>
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
