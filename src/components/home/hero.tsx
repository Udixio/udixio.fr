import {Logo} from "@components/Logo"
import {Button} from "@udixio/ui-react"
import {motion, useMotionValueEvent, useScroll} from "motion/react";
import {type ReactNode, useState} from "react";
// ... imports

export const Hero = ({children}: { children?: ReactNode }) => {

    const {scrollYProgress} = useScroll()

    // Simplified header state - just track scroll for subtle background effect if needed
    const [isScrolled, setIsScrolled] = useState(false)
    useMotionValueEvent(scrollYProgress, 'change', (latest: number) => {
        setIsScrolled(latest > 0.05)
    })

    return <section
        className="relative flex flex-col items-center justify-center bg-surface overflow-hidden min-h-[95vh] py-20 pt-32">

        {/* M3 DECORATIVE ELEMENTS & NOISE */}
        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
            {/* Gradients */}
            <div
                className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary-container rounded-[100%] blur-[120px] mix-blend-multiply opacity-60"></div>
            <div
                className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-secondary-container rounded-full blur-[100px] mix-blend-multiply opacity-40"></div>
            <div
                className="absolute bottom-[20%] right-[-10%] w-[500px] h-[500px] bg-tertiary-container rounded-full blur-[80px] mix-blend-multiply opacity-40"></div>

            {/* INLINE NOISE FILTER */}
            <div className="absolute inset-0 opacity-20 contrast-150 brightness-100 grayscale mix-blend-overlay">
                <svg className="w-full h-full">
                    <filter id="noiseFilter">
                        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
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


        {/* CENTERED AGENCY CONTENT */}
        <div
            className="relative w-full max-width padding-x z-30 flex flex-col items-center text-center gap-10 mt-16 md:mt-0">

            {/* EDITORIAL BLOCK */}
            <motion.div
                className="max-w-4xl flex flex-col items-center gap-8"
                initial={{opacity: 0, y: 30}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.7}}
            >
                {/* Agency Status Badge */}
                <div
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container border border-outline-variant/30 backdrop-blur-sm text-label-large text-on-surface-variant shadow-sm">
                    <span className="relative flex h-2.5 w-2.5">
                            <span
                                className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green"></span>
                    </span>
                    Agence Web • Hauts-de-France
                </div>

                {/* H1 - Massive Editorial Style */}
                <h1 className="text-display-medium md:text-display-large font-bold tracking-tight text-on-surface leading-[1.1] md:leading-[1.1]">
                    Une structure,<br className="hidden md:block"/>
                    <span className="text-primary">pas juste une vitrine.</span>
                </h1>

                {/* Subtext */}
                <p className="text-body-large text-on-surface-variant/90 max-w-2xl leading-relaxed">
                    L'exigence au service de votre vision. Udixio conçoit des outils
                    digitaux <strong>durables</strong> et <strong>maîtrisés</strong>. Votre projet mérite méthode et
                    pédagogie.
                </p>

                {/* CTAs & Signature */}
                <div className="flex flex-col items-center gap-6 mt-2">
                    <div className="flex flex-wrap justify-center gap-4">
                        <Button href="/contact"
                                className="h-14 px-10 rounded-full text-label-large shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all border border-transparent hover:border-primary/20"
                                label="Parler de votre projet"/>
                        <Button variant="outlined" href="/realisations"
                                className="h-14 px-8 rounded-full border-outline-variant/40 bg-surface/50 hover:bg-surface text-label-large"
                                label="Nos dernières réalisations"/>
                    </div>

                    {/* Founder Signature */}
                    <div
                        className="flex items-center gap-3 opacity-80 hover:opacity-100 transition-opacity cursor-default">
                        <div className="flex -space-x-3">
                            <div
                                className="w-10 h-10 rounded-full bg-surface-container-high border-2 border-surface flex items-center justify-center font-bold text-label-medium text-primary">J
                            </div>
                            <div
                                className="w-10 h-10 rounded-full bg-surface-container-high border-2 border-surface flex items-center justify-center font-bold text-label-medium text-secondary">F
                            </div>
                        </div>
                        <div className="text-left">
                            <div className="text-label-medium font-bold text-on-surface">Interlocuteurs directs</div>
                            <div className="text-body-small text-on-surface-variant leading-none">Joël & Florent,
                                fondateurs
                            </div>
                        </div>
                    </div>
                </div>

            </motion.div>


            {/* THE METHOD GRID (Artifacts) - Linked with Arrows */}
            <div
                className="w-full max-w-7xl flex flex-col md:flex-row items-center justify-center gap-6 mt-16 md:mt-24 px-4">

                {/* ARTIFACT 1: STRATEGY */}
                <motion.div
                    className="flex-1 w-full relative group bg-surface-container border border-outline-variant/30 rounded-2xl p-6 text-left hover:bg-surface-container-high hover:border-outline-variant/50 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-md h-full"
                    initial={{opacity: 0, y: 30}}
                    animate={{opacity: 1, y: 0}}
                    transition={{duration: 0.5, delay: 0.2}}
                >
                    <div className="mb-4 flex justify-between items-start">
                        <div className="p-3 bg-secondary-container/30 text-secondary rounded-xl">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                            </svg>
                        </div>
                        <div
                            className="px-2 py-1 bg-surface-container-high rounded text-label-small font-medium text-on-surface-variant/70 tracking-wide font-mono">ÉTAPE
                            1
                        </div>
                    </div>
                    <h3 className="text-title-large font-bold text-on-surface mb-2">Cahier des charges</h3>
                    <p className="text-body-medium text-on-surface-variant">
                        Nous traduisons votre besoin en spécifications techniques claires. Rien n'est laissé au hasard.
                    </p>

                </motion.div>

                {/* ARROW 1 */}
                <div className="flex-none text-outline-variant animate-pulse">
                    <svg className="w-6 h-6 md:w-8 md:h-8 rotate-90 md:rotate-0 transform transition-transform"
                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                              d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                    </svg>
                </div>

                {/* ARTIFACT 2: ARCHITECTURE (Crucial) */}
                <motion.div
                    className="flex-1 w-full relative group bg-surface-container border border-outline-variant/30 rounded-2xl p-6 text-left hover:bg-surface-container-high hover:border-outline-variant/50 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-md h-full"
                    initial={{opacity: 0, y: 30}}
                    animate={{opacity: 1, y: 0}}
                    transition={{duration: 0.5, delay: 0.3}}
                >
                    <div className="mb-4 flex justify-between items-start">
                        <div className="p-3 bg-primary-container/30 text-primary rounded-xl">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
                            </svg>
                        </div>
                        <div
                            className="px-2 py-1 bg-surface-container-high rounded text-label-small font-medium text-on-surface-variant/70 tracking-wide font-mono">ÉTAPE
                            2
                        </div>
                    </div>
                    <h3 className="text-title-large font-bold text-on-surface mb-2">Architecture</h3>
                    <p className="text-body-medium text-on-surface-variant">
                        Structure, UX et SEO. Tout est cartographié avant la moindre ligne de code.
                    </p>

                </motion.div>

                {/* ARROW 2 */}
                <div className="flex-none text-outline-variant animate-pulse">
                    <svg className="w-6 h-6 md:w-8 md:h-8 rotate-90 md:rotate-0 transform transition-transform"
                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                              d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                    </svg>
                </div>

                {/* ARTIFACT 3: OWNERSHIP */}
                <motion.div
                    className="flex-1 w-full relative group bg-surface-container border border-outline-variant/30 rounded-2xl p-6 text-left hover:bg-surface-container-high hover:border-outline-variant/50 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-md h-full"
                    initial={{opacity: 0, y: 30}}
                    animate={{opacity: 1, y: 0}}
                    transition={{duration: 0.5, delay: 0.4}}
                >
                    <div className="mb-4 flex justify-between items-start">
                        <div className="p-3 bg-tertiary-container/30 text-tertiary rounded-xl">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                            </svg>
                        </div>
                        <div
                            className="px-2 py-1 bg-tertiary text-on-tertiary rounded text-label-small font-bold tracking-wide font-mono">FINAL
                        </div>
                    </div>
                    <h3 className="text-title-large font-bold text-on-surface mb-2">Clés en main</h3>
                    <p className="text-body-medium text-on-surface-variant">
                        Vous êtes propriétaire à 100%. Code source, accès serveur, tout est à vous.
                    </p>

                </motion.div>

            </div>

        </div>

        {/* Separator / Extension */}
        <div className={"absolute bottom-0 left-0 w-full z-20 pointer-events-none"}>
            {children}
            {/* Optional fade at bottom */}
            <div className="hidden h-24 bg-gradient-to-t from-surface to-transparent w-full"></div>
        </div>

    </section>


}
