import {Logo} from "@components/Logo"
import {Button, classNames} from "@udixio/ui-react"
import {AnimatePresence, motion, useMotionValueEvent, useScroll} from "motion/react";
import {useState} from "react";


export const Hero = ({children}) => {

    const {scrollYProgress} = useScroll()

    // Simplified header state - just track scroll for subtle background effect if needed
    const [isScrolled, setIsScrolled] = useState(false)
    useMotionValueEvent(scrollYProgress, 'change', (latest: number) => {
        setIsScrolled(latest > 0.05)
    })

    return <section
        className="relative flex flex-col items-center justify-start bg-surface overflow-hidden min-h-[92vh]">

        {/* M3 DECORATIVE ELEMENTS */}
        <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
             <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-primary-container rounded-full blur-[120px] mix-blend-multiply"></div>
             <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-secondary-container rounded-full blur-[100px] mix-blend-multiply"></div>
             <div className="absolute top-[40%] left-[20%] w-[300px] h-[300px] bg-tertiary-container rounded-full blur-[80px] mix-blend-multiply opacity-50"></div>
             {/* Noise Texture Overlay for texture - using CSS for performance if possible, or simple low opacity svg url */}
             <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 grayscale"></div>
        </div>

        {/* HEADER / LOGO - Clean & Stable */}
        <div className="w-full max-width padding-x pt-8 z-50">
             <motion.div 
                className={classNames("flex items-center", isScrolled ? "fixed top-4 left-0 right-0 max-width padding-x z-50" : "relative")}
                layout
             >
                <div className={classNames("transition-all duration-300 p-3 rounded-2xl backdrop-blur-md", isScrolled ? "bg-surface/80 shadow-sm border border-outline-variant/20" : "")}>
                    <Logo className="fill-on-surface h-8 w-auto"/>
                </div>
             </motion.div>
        </div>


        {/* HERO CONTENT */}
        <div className="relative w-full max-width padding-x mt-12 lg:mt-20 mb-32 z-30 grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8 items-center">

            {/* LEFT: PITCH & MESSAGE */}
            <div className="lg:col-span-7 flex flex-col gap-8 order-2 lg:order-1">
                
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="flex flex-col gap-6"
                >
                     {/* Chip Location */}
                    <div className="inline-flex items-center gap-2 self-start px-4 py-1.5 rounded-full bg-surface-container-high border border-outline-variant/30 text-sm font-medium text-on-surface-variant shadow-sm">
                        <span className="relative flex h-2.5 w-2.5">
                             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                             <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                        </span>
                        Agence Web • Hauts-de-France
                    </div>

                    <h1 className="text-display-small md:text-display-medium lg:text-6xl font-bold tracking-tight text-on-surface leading-[1.15]">
                        Votre site internet,<br/>
                        <span className="text-primary relative inline-block">
                             mission stratégique.
                             {/* Underline decoration */}
                             <svg className="absolute w-full h-3 -bottom-1 left-0 text-primary-container -z-10" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" /></svg>
                        </span>
                    </h1>

                    <p className="text-body-large text-on-surface-variant/90 max-w-xl leading-relaxed">
                        Udixio accompagne les TPE/PME qui cherchent **clarté** et **maîtrise**. Nous structurons votre vision pour réaliser un outil digital durable, sans zones d'ombre.
                    </p>

                    {/* Value Props Grid - Mini Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low border border-outline-variant/20">
                             <div className="p-2 rounded-lg bg-secondary-container text-on-secondary-container">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                             </div>
                             <div>
                                 <div className="text-sm font-bold text-on-surface">Pédagogie</div>
                                 <div className="text-xs text-on-surface-variant">Nous parlons votre langue</div>
                             </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low border border-outline-variant/20">
                             <div className="p-2 rounded-lg bg-tertiary-container text-on-tertiary-container">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>
                             </div>
                             <div>
                                 <div className="text-sm font-bold text-on-surface">Maîtrise</div>
                                 <div className="text-xs text-on-surface-variant">Architecture pensée & durable</div>
                             </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4 mt-4 items-center">
                        <Button href="/contact" className="h-12 px-8 rounded-full shadow-md shadow-primary/20" label="Démarrer le projet"/>
                        {/* Reassurance text */}
                        <div className="flex items-center gap-3 pl-2 text-sm text-on-surface-variant font-medium">
                            <div className="flex -space-x-2">
                                <div className="w-8 h-8 rounded-full bg-surface-container-high border-2 border-surface flex items-center justify-center font-bold text-xxs text-primary">J</div>
                                <div className="w-8 h-8 rounded-full bg-surface-container-high border-2 border-surface flex items-center justify-center font-bold text-xxs text-secondary">F</div>
                            </div>
                            <span className="text-xs leading-tight">Interlocuteurs directs,<br/>sans intermédiaire.</span>
                        </div>
                    </div>

                </motion.div>
            </div>

            {/* RIGHT: VISUAL STAGING (Material 3 Cards Stack) */}
            <div className="lg:col-span-5 relative w-full flex items-center justify-center lg:justify-end order-1 lg:order-2">
                 
                 {/* Container for the 3D-ish composition */}
                 <motion.div 
                    className="relative w-full max-w-[420px] h-[450px]"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                 >
                    {/* Visual Grid Background */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] rounded-3xl border border-outline-variant/30"></div>

                    {/* CARD 1: Cadrage - Top Left Floating */}
                    <motion.div 
                        className="absolute top-6 left-4 w-60 bg-surface rounded-2xl shadow-lg border border-outline-variant/40 p-4 z-10"
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
                                <span className="font-bold text-xs">1</span>
                            </div>
                            <span className="text-title-small font-bold text-on-surface">Cahier des charges</span>
                        </div>
                        <div className="space-y-2">
                            <div className="h-2 w-3/4 bg-surface-container-high rounded-full"></div>
                            <div className="h-2 w-1/2 bg-surface-container-high rounded-full"></div>
                        </div>
                        <div className="mt-3 flex gap-2">
                            <span className="text-[10px] px-2 py-1 rounded-md bg-green-100 text-green-700 font-medium flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                                Besoin compris
                            </span>
                        </div>
                    </motion.div>

                    {/* CARD 2: Architecture/Structure - Center/Right Dominant */}
                    <motion.div 
                        className="absolute top-32 right-0 w-64 md:w-72 bg-surface-container-low rounded-2xl shadow-xl border border-outline-variant/40 p-5 z-20"
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                    >
                         <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-surface-variant"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-surface-variant"></div>
                            </div>
                            <span className="text-[10px] font-medium text-on-surface-variant">Architecture / Arborescence</span>
                         </div>
                         
                         {/* Visual Sitemap Structure */}
                         <div className="flex flex-col items-center gap-2 py-2">
                             <div className="px-3 py-1.5 rounded-lg bg-surface border border-primary/30 shadow-sm text-xs font-semibold text-on-surface w-fit">Accueil Stratégique</div>
                             <div className="h-4 w-px bg-outline-variant"></div>
                             <div className="grid grid-cols-2 gap-4 w-full px-2">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="h-px w-full bg-outline-variant relative top-0"></div>
                                    <div className="h-2 w-px bg-outline-variant -mt-2"></div>
                                    <div className="px-2 py-1 rounded bg-surface border border-outline-variant/30 text-[10px] text-on-surface-variant w-full text-center">Offre</div>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="h-px w-full bg-outline-variant relative top-0"></div>
                                    <div className="h-2 w-px bg-outline-variant -mt-2"></div>
                                    <div className="px-2 py-1 rounded bg-surface border border-outline-variant/30 text-[10px] text-on-surface-variant w-full text-center">Contact</div>
                                </div>
                             </div>
                         </div>
                         
                         <div className="absolute -bottom-3 -right-3 bg-primary text-on-primary px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg flex items-center gap-1">
                             <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                             Validé
                         </div>
                    </motion.div>

                    {/* CARD 3: Livraison - Bottom Left */}
                    <motion.div 
                        className="absolute bottom-6 left-6 w-56 bg-surface rounded-2xl shadow-lg border border-outline-variant/40 p-4 z-30"
                        animate={{ y: [0, 6, 0] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    >
                         <div className="flex items-center gap-3 mb-2">
                             <div className="p-1.5 rounded-lg bg-tertiary-container text-on-tertiary-container">
                                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
                             </div>
                             <div>
                                 <div className="text-sm font-bold text-on-surface">Vous avez les clés</div>
                             </div>
                         </div>
                         <p className="text-xs text-on-surface-variant leading-snug">
                             Propriété totale de votre site.<br/>Autonomie et transparence.
                         </p>
                    </motion.div>

                 </motion.div>
            </div>

        </div>


        <div className={"absolute bottom-0 left-0 w-full z-20"}>
            <svg preserveAspectRatio="none" className="z-10 fill-surface-container-lowest w-screen"
                 width="850"
                 height="50"
                 viewBox="0 0 850 72"
                 xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd"
                      d="M850 72C850 72 659.721 0 425 0C190.279 0 0 72 0 72H425H850Z"/>
            </svg>
            {children}

        </div>

    </section>
}
