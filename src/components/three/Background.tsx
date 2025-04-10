import React, {useRef} from "react";
import {Canvas} from "@react-three/fiber";
import {NoToneMapping} from "three";
import {BackgroundStar} from "./BackgroundStar";
import {ControlledCamera} from "@components/three/ControlledCamera.tsx";
import {BackgroundColor} from "./BackgroundColor";

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
                className={"blur-3xl"}
            >
                <ControlledCamera canvasRef={canvasRef}/>
                <BackgroundColor/>
            </Canvas>
            <Canvas
                className={"top-0 !absolute"}
            >
                <ControlledCamera canvasRef={canvasRef}/>

                <BackgroundStar/>
            </Canvas>
        </div>
    );
};