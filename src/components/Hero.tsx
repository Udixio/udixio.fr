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

const RepulsiveShape = ({
                            shape,
                            mouseX,
                            mouseY
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
    mouseX: MotionValue<number>;
    mouseY: MotionValue<number>;
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const clipPathRef = useRef<SVGPathElement>(null);
    const uniqueId = `blob-${shape.id}`;

    // Physics / Drift state
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const velocity = useRef({x: 0, y: 0});

    // Blob Vertices State
    // 12 points for organic, complex feel
    // 12 points for organic, complex feel
    const minPoints = 5;
    const maxPoints = 18;
    const numPoints = Math.floor(Math.random() * (maxPoints - minPoints + 1)) + minPoints;
    const pointsRef = useRef(
        Array.from({length: numPoints}).map((_, i) => ({
            // We keep angles fixed relative to each other to prevent self-intersection knots,
            // but we will animate the 'phase' of the noise to make features travel around the shape.
            angle: (Math.PI * 2 * i) / numPoints,

            // Feature 1: "Breathing" / Appearance & Disappearance
            // We modulate the amplitude over time. Faster change now.
            baseAmp: 5 + Math.random() * 10,
            ampSpeed: 0.0002 + Math.random() * 0.0004, // Corrected speed (was too fast)
            ampPhase: Math.random() * 10,

            // Feature 2: "Traveling" / Moving internal points
            // Features travel faster around the perimeter
            waveSpeed: 0.0002 + Math.random() * 0.0004,
            wavePhase: Math.random() * 10,

            // Feature 3: Base Irregularity
            baseRadiusOffset: -10 + Math.random() * 25,

            currentX: 0,
            currentY: 0
        }))
    );

    useAnimationFrame((time) => {
        if (!containerRef.current || !clipPathRef.current) return;

        // --- 1. GLOBAL DRIFT PHYSICS ---
        const mx = mouseX.get();
        const my = mouseY.get();

        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dx = mx - centerX;
        const dy = my - centerY;
        const distToMouse = Math.sqrt(dx * dx + dy * dy);

        const driftRadius = 600;

        if (distToMouse < driftRadius) {
            const force = (1 - distToMouse / driftRadius) * 0.4;
            const dirX = -(dx / distToMouse || 0);
            const dirY = -(dy / distToMouse || 0);
            velocity.current.x += dirX * force;
            velocity.current.y += dirY * force;
        }

        const margin = 0;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const wallForce = 0.8; // Stronger walls to contain the high energy

        if (centerX < margin) {
            velocity.current.x += wallForce;
            velocity.current.x *= 0.8;
        }
        if (centerX > vw - margin) {
            velocity.current.x -= wallForce;
            velocity.current.x *= 0.8;
        }
        if (centerY < margin) {
            velocity.current.y += wallForce;
            velocity.current.y *= 0.8;
        }
        if (centerY > vh - margin) {
            velocity.current.y -= wallForce;
            velocity.current.y *= 0.8;
        }

        velocity.current.x *= 0.94;
        velocity.current.y *= 0.94;

        x.set(x.get() + velocity.current.x);
        y.set(y.get() + velocity.current.y);


        // --- 2. VERTEX DEFORMATION ---
        // Internal logic uses a 200x200 coordinate system
        const centerSize = 100;

        const localMouseX = mx - rect.left;
        const localMouseY = my - rect.top;
        const scaleFactorX = 200 / rect.width;
        const scaleFactorY = 200 / rect.height;
        const svgMx = localMouseX * scaleFactorX;
        const svgMy = localMouseY * scaleFactorY;

        const dxCenter = svgMx - 100;
        const dyCenter = svgMy - 100;
        const distCenter = Math.sqrt(dxCenter * dxCenter + dyCenter * dyCenter);

        // Volume reaction
        const pressExpansion = Math.max(0, (120 - distCenter) * 0.25);

        const renderPoints = pointsRef.current.map((pt, i) => {
            const t = time;

            // 1. Life Cycle: Some bumps grow, others shrink (appear/disappear)
            // Factor varies between 0.2 (almost smooth) and 1.5 (very prominent)
            const lifeFactor = Math.sin(t * pt.ampSpeed + pt.ampPhase) * 0.6 + 0.9;
            const currentAmp = pt.baseAmp * lifeFactor;

            // 2. Traveling Wave: Bumps move slowly around the perimeter
            // We create complex noise based on angle + traveling phase
            const phase = t * pt.waveSpeed + pt.wavePhase;
            const noise =
                Math.sin(phase) * currentAmp +
                Math.cos(phase * 0.7 + i) * (currentAmp * 0.5);

            // Radius: Base + Irregularity + Dynamic Noise + Press
            const r = 75 + pt.baseRadiusOffset + noise + pressExpansion;

            let px = 100 + Math.cos(pt.angle) * r;
            let py = 100 + Math.sin(pt.angle) * r;

            // Local Point Repulsion
            const vecX = px - svgMx;
            const vecY = py - svgMy;
            const pointDist = Math.sqrt(vecX * vecX + vecY * vecY);
            // Hard Collider Logic
            const pointInteractionRadius = 100; // Radius of the "Solid" Mouse Sphere

            if (pointDist < pointInteractionRadius) {
                // HARD CONSTRAINT: Point MUST be at radius distance
                // We project the point out to the surface of the sphere
                const angleToPoint = Math.atan2(vecY, vecX);

                // New position on the circumference
                px = svgMx + Math.cos(angleToPoint) * pointInteractionRadius;
                py = svgMy + Math.sin(angleToPoint) * pointInteractionRadius;
            }

            // Normalize to 0..1 for clipPathUnits="objectBoundingBox"
            return {x: px / 200, y: py / 200};
        });

        // Update the Clip Path 'd' attribute directly
        clipPathRef.current.setAttribute("d", spline(renderPoints));
    });

    const floatDuration = shape.duration * 2;
    const floatX = Math.random() * 50 + 25;
    const floatY = Math.random() * 50 + 25;

    return (
        <motion.div
            ref={containerRef}
            className="absolute"
            // Apply drop shadow filter to wrapper so it follows the clipped shape
            style={{
                width: shape.width,
                height: shape.height,
                top: shape.top,
                left: shape.left,
                x,
                y,
                filter: "drop-shadow(0px 10px 20px rgba(0,0,0,0.15))"
            }}
            animate={{
                x: [0, floatX, -floatX, 0],
                y: [0, -floatY, floatY, 0],
            }}
            transition={{
                duration: floatDuration,
                repeat: Infinity,
                ease: "easeInOut",
            }}
        >
            {/* Hidden SVG defining the clip path */}
            <svg width="0" height="0" className="absolute">
                <defs>
                    <clipPath id={uniqueId} clipPathUnits="objectBoundingBox">
                        <path ref={clipPathRef}/>
                    </clipPath>
                </defs>
            </svg>

            {/* Visible Div using the User's BG Class + Clip Path */}
            <div
                className={`w-full h-full ${shape.background} border-white/20`}
                style={{
                    clipPath: `url(#${uniqueId})`,
                    // Border simulation via internal shadow or separate element is hard with clip-path
                    // We assume outline isn't strictly necessary or we'd need a separate svg stroke overlay.
                    // Given the "Fluid" request, borderless with shadow is cleaner.
                }}
            />

            {/* Optional: Add an overlay for 'border' effect if needed, but 'fluid' usually implies borderless or soft. 
                If border was vital, we'd use the SVG stroke approach. 
                Let's stick to the color accuracy requested. */}
        </motion.div>
    );
};

export const Hero = ({children}: { children?: ReactNode }) => {

    const [isMenuFixed, setIsMenuFixed] = useState(false);
    const [fabVisible, setFabVisible] = useState(true);

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
                        <RepulsiveShape key={shape.id} shape={shape} mouseX={mouseXPx} mouseY={mouseYPx}/>
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
