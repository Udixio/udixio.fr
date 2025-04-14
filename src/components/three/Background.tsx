import React, {useRef} from "react";
import {Canvas} from "@react-three/fiber";
import {NoToneMapping} from "three";
import {ControlledCamera} from "@components/three/ControlledCamera.tsx";
import {BackgroundColor} from "./BackgroundColor";
import {BackgroundStar} from "@components/three/BackgroundStar.tsx";

export const Background = ({
                               count = 20,
                               circleRadius = 1,

                               className = "",
                           }) => {
    const canvasRef = useRef<HTMLDivElement>(null); // Référence pour le conteneur du `Canvas`


    return (
        <div ref={canvasRef}
             className={` fixed -z-10   top-0 h-screen w-screen !fixed"  ${className}`}>

            <Canvas
                gl={{toneMapping: NoToneMapping}}
                className={"blur-3xl  opacity-30"}
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
        </div>
    );
};