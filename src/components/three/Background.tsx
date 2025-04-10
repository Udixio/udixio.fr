import React, {useRef} from "react";
import {Canvas} from "@react-three/fiber";
import {NoToneMapping} from "three";
import {BackgroundStar} from "./BackgroundStar";
import {ControlledCamera} from "@components/three/ControlledCamera.tsx";
import {BackgroundColor} from "./BackgroundColor";
import {BrightnessContrast, EffectComposer} from "@react-three/postprocessing";

export const Background = ({
                               count = 20,
                               circleRadius = 1,

                               className = "",
                           }) => {
    const canvasRef = useRef<HTMLDivElement>(null); // Référence pour le conteneur du `Canvas`


    return (
        <div ref={canvasRef}
             className={` fixed -z-10 opacity-70  top-0 h-screen w-screen !fixed"  ${className}`}>

            <Canvas
                gl={{toneMapping: NoToneMapping}}
                className={"blur-3xl  opacity-70"}
            >
                <ControlledCamera canvasRef={canvasRef}/>
                <BackgroundColor count={10} size={20}/>
                <EffectComposer>
                    {/* Réduction de la lumière globale et ajustement du contraste */}
                    <BrightnessContrast brightness={0.15} contrast={0.25}/>
                </EffectComposer>

            </Canvas>
            <Canvas
                className={"top-0 !absolute"}
            >
                <ControlledCamera canvasRef={canvasRef}/>

                <BackgroundStar count={1000}/>
            </Canvas>
        </div>
    );
};