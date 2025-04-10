import React, {useRef} from "react";
import {Canvas} from "@react-three/fiber";
import {NoToneMapping} from "three";
import {BackgroundColor} from "@components/three/BackgroundColor.tsx";
import {BackgroundStar} from "./BackgroundStar";
import {ControlledCamera} from "@components/three/ControlledCamera.tsx";

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

            >
                <ControlledCamera canvasRef={canvasRef}/>
                <BackgroundColor/>
                <BackgroundStar/>
            </Canvas>
        </div>
    );
};