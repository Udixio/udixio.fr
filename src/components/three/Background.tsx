import React, {useRef} from "react";
import {Canvas} from "@react-three/fiber";
import {NoToneMapping} from "three";
import {ControlledCamera} from "@components/three/ControlledCamera.tsx";
import {BackgroundColor} from "./BackgroundColor";
import {BackgroundStar} from "@components/three/BackgroundStar.tsx";
import {AnimatePresence, motion, useInView} from "framer-motion";

export const Background = ({
                               count = 20,
                               circleRadius = 1,

                               className = "",
                           }) => {
    const canvasRef = useRef<HTMLDivElement>(null); // Référence pour le conteneur du `Canvas`

    const isInView = useInView(canvasRef)

    return (
        <div ref={canvasRef}
             className={` absolute -z-10   top-0 h-screen w-screen ${className}`}>
            <AnimatePresence>
                {
                    isInView && (
                        <motion.div
                            initial={{opacity: 0,}}
                            animate={{opacity: 1,}}
                            exit={{opacity: 0,}}
                            transition={{duration: 1, ease: "easeInOut",}}
                            className={"w-full h-full"}>
                            <Canvas
                                gl={{toneMapping: NoToneMapping}}
                                className={"blur-xl  opacity-30"}
                            >
                                <ControlledCamera canvasRef={canvasRef}/>
                                <BackgroundColor count={10} size={20}/>

                            </Canvas>
                            <Canvas
                                className={"top-0 !absolute opacity-90 "}
                            >
                                <ControlledCamera canvasRef={canvasRef}/>

                                <BackgroundStar count={1000}/>
                            </Canvas>
                        </motion.div>
                    )
                }
            </AnimatePresence>
        </div>
    );
};