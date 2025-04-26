import React, {useRef} from "react";
import {Canvas} from "@react-three/fiber";
import {ControlledCamera} from "@components/three/ControlledCamera.tsx";
import {BackgroundStar} from "@components/three/BackgroundStar.tsx";
import {motion, useMotionValueEvent, useScroll, useTransform} from "framer-motion";

export const Hero = ({children}) => {
    const canvasRef = useRef<HTMLDivElement>(null); // Référence pour le conteneur du `Canvas`


    const ref = useRef(null)
    const contentRef = useRef(null)
    const {scrollY} = useScroll({
        target: contentRef,
        offset: ["start end", "end end"]
    })

    const scrollYProgress = useTransform(() => {

        const scroll = scrollY.get()
        if (ref.current && contentRef.current) {
            const {height: containerHeight} = ref.current.getBoundingClientRect();
            const {height: contentHeight} = contentRef.current.getBoundingClientRect();

            console.log("containerHeight", containerHeight)
            return scroll / (containerHeight - contentHeight)
        }

        return 0
    })

    useMotionValueEvent(scrollYProgress, 'change', (latestValue) => console.log(latestValue))

    const width = useTransform(scrollYProgress, [0, 1], ["0%", "125%"])
    const bottom = useTransform(scrollYProgress, [0, 1], ["-25%", "0%"])


    return (
        <section ref={ref} id=""
                 className=" relative  min-h-[200vh]    ">
            <div ref={contentRef} className={`sticky min-h-screen top-0 flex items-center justify-center  `}>
                <div ref={canvasRef}
                     className={` absolute -z-10  top-0 h-full w-full `}>

                    <Canvas
                        className={"top-0 !absolute opacity-90 bg-black"}
                    >

                        <ControlledCamera canvasRef={canvasRef} scrollYProgress={scrollYProgress}/>

                        <BackgroundStar/>
                    </Canvas>
                </div>
                <div className="dark-mode text-on-surface flex items-center flex-col relative max-width padding-x">
                    {children}
                </div>
                <motion.div

                    className={"absolute bottom-0 w-full h-32"}>

                    <motion.svg
                        preserveAspectRatio="none"

                        style={{
                            width,
                            bottom
                        }}
                        className=" fill-surface  max-h-full  absolute left-1/2  -translate-x-1/2 h-auto translate-y-1/2"


                        viewBox="0 0 850 384"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd" clip-rule="evenodd"
                              d="M850 384C850 171.923 659.721 0 425 0C190.279 0 0 171.923 0 384H425H850Z"/>
                    </motion.svg>

                </motion.div>


            </div>


        </section>

    )
        ;
};
