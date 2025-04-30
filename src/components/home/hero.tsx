import {Logo} from "@components/Logo"
import {Button, classNames} from "@udixio/ui"
import {Background} from "@components/three/Background.tsx";
import {AnimatePresence, motion, useMotionValueEvent, useScroll} from "framer-motion";
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


        <div className=" relative w-full min-h-[50vh] max-width padding-x my-48 z-30">


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
                    className={"padding-x top-8 left-0 "}
                    style={{position: isFirst ? "fixed" : "static",}}
                >
                    <motion.div layout transition={{duration: 1}}>
                        <Logo className="fill-on-surface/[0.1]"/>
                    </motion.div>
                </div>
            </div>


            <h1 className="text-display-small md:text-display-large  max-w-4xl mt-8">Votre site, pensé comme une
                mission
                stratégique</h1>

            <p
                className={classNames("text-body-large  max-w-2xl transition-all duration-300 mt-8", {
                    "visible opacity-100": isMinimize,

                })}>Chez Udixio, nous concevons des expériences
                sur-mesure qui valorisent vos contenus, renforcent votre image, et facilitent votre quotidien.</p>
            <div className={classNames("flex gap-4 transition-all duration-300 mt-8", {
                "visible opacity-100": isMinimize,

            })}>
                <Button href="#contact" className="w-fit " label="Contacter un expert"/>
                {/*<Button variant="outlined" href="#contact" className="bg-surface/30"*/}
                {/*        label="Découvrir notre méthode"/>*/}
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
                <path fill-rule="evenodd" clip-rule="evenodd"
                      d="M850 72C850 72 659.721 0 425 0C190.279 0 0 72 0 72H425H850Z"/>
            </svg>
            {children}

        </div>

    </section>
}