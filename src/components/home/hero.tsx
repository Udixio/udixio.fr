import {Logo} from "@components/Logo"
import {Button, classNames} from "@udixio/ui-react"
import {Background} from "@components/three/Background.tsx";
import {AnimatePresence, motion, useMotionValueEvent, useScroll} from "motion/react";
import {useState} from "react";


export const Hero = ({children}) => {

    const {scrollYProgress} = useScroll()

    const [isMinimize, setIsMinimize] = useState(false)

    useMotionValueEvent(scrollYProgress, 'change', (latest) => {
        setIsMinimize(latest > 0)
        setIsFirst(true)
    })

    const [isFirst, setIsFirst] = useState(false)

    return <section

        className=" relative  flex items-center justify-center bg-gradient-to-b from-surface to-transparent z-10">


        <div className=" relative w-full min-h-[50vh] max-width padding-x mb-64 mt-32 md:my-48 z-30">


            <div
                // animate={{
                //     height: isMinimize ? 0 : "auto",
                // }}
                // transition={{duration: 1}}
            >
                <AnimatePresence>
                    {
                        isFirst &&
                        <motion.div className={"padding-x top-8 left-0 invisible"}
                                    initial={{
                                        height: "auto",
                                    }}
                                    animate={{
                                        height: 0,
                                    }}

                                    transition={{duration: 1}}
                        >
                            <Logo className="fill-on-surface/[0.1]"/>
                        </motion.div>
                    }
                </AnimatePresence>
                <div
                    className={classNames("padding-x top-8 left-0 ", {'static lg:fixed': isFirst, 'static': !isFirst})}
                >
                    <motion.div layout transition={{duration: 1}}>
                        <Logo className="fill-on-surface/[0.1]"/>
                    </motion.div>
                </div>
            </div>


            <h1 className="text-display-small md:text-display-large max-w-4xl mt-8">Votre site web : une mission stratégique pour votre entreprise</h1>
            <h2 className="text-headline-medium mt-6 max-w-3xl">Des sites web sur-mesure pour booster votre visibilité et vos prospects</h2>

            <div
                className={classNames("text-body-large max-w-2xl transition-all duration-300 mt-6 space-y-4", {
                    "visible opacity-100": isMinimize,
                })}
            >
                <p>Agence digitale spécialisée en création de sites sur-mesure pour TPE/PME exigeantes.</p>
                <ul className="list-disc pl-6">
                    <li>+ de visibilité sur le web</li>
                    <li>+ de prospects qualifiés</li>
                    <li>Une image qui inspire confiance</li>
                </ul>
                <p>Basée dans les Hauts-de-France, avec présence à Amiens et Le Havre. Agence lancée récemment.</p>
            </div>

            <div className={classNames("flex flex-wrap gap-4 transition-all duration-300 mt-8", {
                "visible opacity-100": isMinimize,
            })}>
                <Button href="/contact" className="w-fit" label="Demandez un diagnostic offert"/>
                <Button variant="outlined" href="/realisations" className="bg-surface/30" label="Parcourir nos réalisations"/>
            </div>


        </div>
        <div className={"w-full absolute h-full  top-0 left-0 -z-10 overflow-hidden"}>
            <Background className=""
            />
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
