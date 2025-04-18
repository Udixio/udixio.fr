import React, {useRef} from "react";
import {Canvas} from "@react-three/fiber";
import {ControlledCamera} from "@components/three/ControlledCamera.tsx";
import {BackgroundStar} from "@components/three/BackgroundStar.tsx";

export const Background = ({
                               count = 20,
                               circleRadius = 1,

                               className = "",
                           }) => {
    const canvasRef = useRef<HTMLDivElement>(null); // Référence pour le conteneur du `Canvas`


    return (
        <div ref={canvasRef}
             className={` absolute -z-10   top-0 h-full w-full "  ${className}`}>

            <Canvas
                className={"top-0 !absolute opacity-90 bg-black"}
            >

                <ControlledCamera canvasRef={canvasRef}/>

                <BackgroundStar/>
            </Canvas>
        </div>
    );
};