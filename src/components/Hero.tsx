import {Logo} from "@components/Logo.tsx"
import {motion} from "motion/react";
import {type ReactNode, useState} from "react";
import {SectionPadding} from "@components/SectionPadding.tsx";
import {Menu} from "@components/Menu.tsx";
import {createPortal} from "react-dom";
// ... imports

export const Hero = ({children}: { children?: ReactNode }) => {

    // -- Parallax Logic Removed --
    const [isMenuFixed, setIsMenuFixed] = useState(false);

    return <SectionPadding end as="section" onClose={() => setIsMenuFixed(true)} onOpen={() => setIsMenuFixed(false)}
    >
        <div
            className="relative flex flex-col items-center justify-center bg-surface overflow-hidden min-h-[80vh] py-20 pt-32">
            {/* M3 DECORATIVE ELEMENTS - WARM, DYNAMIC & TEXTURED */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">

                {/* 1. WARM HALO & 2. COOL BALANCE - Masked by Noise */}
                <div className="absolute inset-0 overflow-hidden" style={{
                    maskImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                    WebkitMaskImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                    maskRepeat: 'repeat',
                    WebkitMaskRepeat: 'repeat',
                }}>
                    <motion.div
                        animate={{
                            scale: [1, 1.2, 1],
                            rotate: [0, 5, 0],
                            opacity: [0.6, 0.8, 0.6] // Glowing effect
                        }}
                        transition={{duration: 14, repeat: Infinity, ease: "easeInOut"}}
                        className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[1000px] h-[800px] bg-secondary-container/50 rounded-full blur-[100px] mix-blend-normal transform-gpu"
                    ></motion.div>

                    <motion.div
                        animate={{
                            scale: [1, 1.3, 1],
                            rotate: [0, -10, 0],
                            opacity: [0.5, 0.7, 0.5] // Deep breathing
                        }}
                        transition={{duration: 18, repeat: Infinity, ease: "easeInOut"}}
                        className="absolute bottom-[-10%] right-[-10%] w-[900px] h-[800px] bg-secondary-container rounded-full blur-[100px] mix-blend-normal transform-gpu"
                    ></motion.div>
                </div>

                {/* 3. MICRO-GRAIN DIRECTIONAL - Cleaner, mastered texture */}
                <div className="absolute inset-0  mix-blend-overlay z-10 opacity-50">
                    <svg className="w-full h-full">
                        <filter id="noiseFilter">
                            <feTurbulence type="fractalNoise" baseFrequency="1.5 0.8" numOctaves="1"
                                          stitchTiles="stitch"/>
                        </filter>
                        <rect width="100%" height="100%" filter="url(#noiseFilter)"/>
                    </svg>
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
                    className={"absolute top-0 mx-auto left-0 right-0 w-fit mt-4"}
                >
                    <Menu isScrolled={false}/>
                </motion.div>

            }
            {
                isMenuFixed && createPortal(
                    <motion.div
                        layoutId="main-menu"
                        className={"fixed top-0 mx-auto left-0 right-0 w-fit mt-4"}
                    >
                        <Menu isScrolled={true}/>
                    </motion.div>,
                    document.body
                )
            }


            {/* CENTERED AGENCY CONTENT */}
            <div
                className="relative w-full section">

                {children}


            </div>

        </div>


    </SectionPadding>


}
