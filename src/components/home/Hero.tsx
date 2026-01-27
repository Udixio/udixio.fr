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
        className="relative flex flex-col items-center justify-center bg-surface overflow-hidden min-h-[80vh] py-20 pt-32">

        {/* M3 DECORATIVE ELEMENTS - SOFTENED */}
        {/* M3 DECORATIVE ELEMENTS - STRUCTURED & PRESENCE */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">

            {/* 1. STRUCTURAL GRID PATTERN (Adds depth without "noise") */}
            <div className="absolute inset-0 opacity-50"
                 style={{
                     backgroundImage: `radial-gradient(var(--color-on-surface-variant) 1px, transparent 1px)`,
                     backgroundSize: '32px 32px'
                 }}>
            </div>

            {/* 2. GRADIENT BLOBS - Reinforced for Light Mode */}
            {/* Top Center - Primary - Light glow */}
            <div
                className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary-container/60 rounded-[100%] blur-[120px] opacity-50 mix-blend-normal"></div>

            {/* Bottom Left - Secondary - Soft base */}
            <div
                className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-secondary-container/50 rounded-full blur-[100px] opacity-40 mix-blend-normal"></div>

            {/* Center Right - Tertiary - Balancing warmth */}
            <div
                className="absolute top-[30%] right-[-10%] w-[500px] h-[500px] bg-tertiary-container/40 rounded-full blur-[100px] opacity-40 mix-blend-normal"></div>

            {/* 3. CENTER GLOW - Highlights the H1 directly */}
            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-surface rounded-full blur-[80px] opacity-60 mix-blend-overlay"></div>

            {/* 4. TEXTURE NOISE - Grainy feel */}
            <div className="absolute inset-0 opacity-50 mix-blend-overlay">
                <svg className="w-full h-full">
                    <filter id="noiseFilter">
                        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/>
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
            className="relative w-full max-width padding-x z-30 flex flex-col items-center text-center gap-8 mt-16 md:mt-0">

            {/* EDITORIAL BLOCK */}
            <motion.div
                className="max-w-4xl flex flex-col items-center gap-8"
                initial={{opacity: 0, y: 30}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.7}}
            >
                {/* Agency Status Badge - Sober Version */}
                <div
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-surface-container-low border border-outline-variant/20 text-label-small uppercase tracking-wider text-on-surface-variant/80">
                    Agence Web • Hauts-de-France
                </div>

                {/* H1 - Massive Editorial Style */}
                <h1 className="text-display-medium md:text-display-large font-bold tracking-tight text-on-surface leading-[1.1] md:leading-[1.1]">
                    Votre site,<br className="hidden md:block"/>
                    <span className="text-primary">pensé pour grandir sans surprise.</span>
                </h1>

                {/* Subtext */}
                <p className="text-body-large text-on-surface-variant/90 max-w-2xl leading-relaxed">
                    Udixio structure vos projets digitaux sur-mesure pour un site
                    <strong> performant</strong> et <strong>durable</strong>, sans flou ni dépendance. Vous gardez la
                    main sur chaque décision.
                </p>

                {/* CTAs & Signature */}
                <div className="flex flex-col items-center gap-6 mt-2">
                    <div className="flex flex-wrap justify-center gap-4">
                        <Button href="/contact"
                                className="h-14 px-10 rounded-full text-label-large shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all border border-transparent hover:border-primary/20"
                                label="Discutons de votre projet"/>
                        <Button variant="outlined" href="/methode"
                                className="h-14 px-8 rounded-full border-outline-variant/40 bg-surface/50 hover:bg-surface text-label-large"
                                label="Découvrir la méthode Udixio"/>
                    </div>

                </div>

            </motion.div>


            {/* THE METHOD GRID (Artifacts) - Unified & Sober */}
            <div
                className="w-full max-w-7xl flex flex-col md:flex-row items-center justify-center gap-6 mt-12 md:mt-20 px-4">

                {/* ARTIFACT 1: STRATEGY */}
                <motion.div
                    className="flex-1 w-full relative group bg-surface-container border border-outline-variant/30 rounded-2xl p-6 text-left hover:bg-surface-container-high hover:border-outline-variant/50 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-md h-full"
                    initial={{opacity: 0, y: 30}}
                    animate={{opacity: 1, y: 0}}
                    transition={{duration: 0.5, delay: 0.2}}
                >
                    <div className="mb-4 flex justify-between items-start">
                        <div className="p-3 bg-surface-container-highest text-primary rounded-xl">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                            </svg>
                        </div>
                        <div
                            className="px-2 py-1 bg-surface-container-high border border-outline-variant/20 rounded text-label-small font-medium text-on-surface-variant/70 tracking-wide font-mono">01
                        </div>
                    </div>
                    <h3 className="text-title-large font-bold text-on-surface mb-2">Cadrage & objectifs</h3>
                    <p className="text-body-medium text-on-surface-variant">
                        Atelier initial, priorités et contraintes posées. Le périmètre est validé avant d'avancer.
                    </p>
                </motion.div>

                {/* ARROW 1 - Neutral */}
                <div className="flex-none text-outline-variant">
                    <svg className="w-6 h-6 md:w-8 md:h-8 rotate-90 md:rotate-0 transform transition-transform"
                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                              d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                    </svg>
                </div>

                {/* ARTIFACT 2: ARCHITECTURE */}
                <motion.div
                    className="flex-1 w-full relative group bg-surface-container border border-outline-variant/30 rounded-2xl p-6 text-left hover:bg-surface-container-high hover:border-outline-variant/50 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-md h-full"
                    initial={{opacity: 0, y: 30}}
                    animate={{opacity: 1, y: 0}}
                    transition={{duration: 0.5, delay: 0.3}}
                >
                    <div className="mb-4 flex justify-between items-start">
                        <div className="p-3 bg-surface-container-highest text-primary rounded-xl">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
                            </svg>
                        </div>
                        <div
                            className="px-2 py-1 bg-surface-container-high border border-outline-variant/20 rounded text-label-small font-medium text-on-surface-variant/70 tracking-wide font-mono">02
                        </div>
                    </div>
                    <h3 className="text-title-large font-bold text-on-surface mb-2">Plan d'action partagé</h3>
                    <p className="text-body-medium text-on-surface-variant">
                        Feuille de route claire, validations régulières et suivi lisible pour garder le contrôle.
                    </p>
                </motion.div>

                {/* ARROW 2 - Neutral */}
                <div className="flex-none text-outline-variant">
                    <svg className="w-6 h-6 md:w-8 md:h-8 rotate-90 md:rotate-0 transform transition-transform"
                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                              d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                    </svg>
                </div>

                {/* ARTIFACT 3: DELIVERY */}
                <motion.div
                    className="flex-1 w-full relative group bg-surface-container border border-outline-variant/30 rounded-2xl p-6 text-left hover:bg-surface-container-high hover:border-outline-variant/50 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-md h-full"
                    initial={{opacity: 0, y: 30}}
                    animate={{opacity: 1, y: 0}}
                    transition={{duration: 0.5, delay: 0.4}}
                >
                    <div className="mb-4 flex justify-between items-start">
                        <div className="p-3 bg-surface-container-highest text-primary rounded-xl">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                            </svg>
                        </div>
                        <div
                            className="px-2 py-1 bg-surface-container-high border border-outline-variant/20 rounded text-label-small font-medium text-on-surface-variant/70 tracking-wide font-mono">03
                        </div>
                    </div>
                    <h3 className="text-title-large font-bold text-on-surface mb-2">Autonomie & clés</h3>
                    <p className="text-body-medium text-on-surface-variant">
                        Code source, accès et documentation remis. Formation incluse pour vous rendre autonome.
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
