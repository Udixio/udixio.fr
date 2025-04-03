import React, {useMemo, useRef, useState} from "react";
import {Canvas, useFrame} from "@react-three/fiber";
import useMouse from "@react-hook/mouse-position";
import {Points} from "@react-three/drei";

interface CircleProps {
    circleRadius: number;
    mouse: { x: number; y: number }; // Coordonnées de la souris (normalisées)
    index: number;
    canEscape?: boolean;
}


function PointsMaterial(props: { size: number, color: any, transparent: boolean }) {
    return null;
}

const NebulaParticles = () => {
    const pointsRef = useRef(null);

    // Génération des données pour les positions, couleurs et tailles
    const {positions, colors, sizes} = useMemo(() => {
        const numPoints = 1000; // Nombre total de points
        const positions = new Float32Array(numPoints * 3); // x, y, z pour chaque point
        const colors = new Float32Array(numPoints * 3); // r, g, b pour chaque point
        const sizes = new Float32Array(numPoints); // Une taille par point

        for (let i = 0; i < numPoints; i++) {
            // Position aléatoire dans l'espace 3D (-5 à 5 pour chaque coordonnée)
            positions[i * 3] = (Math.random() - 0.5) * 10;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 10;

            // Couleur aléatoire
            colors[i * 3] = Math.random(); // Rouge
            colors[i * 3 + 1] = Math.random(); // Vert
            colors[i * 3 + 2] = Math.random(); // Bleu

            // Taille aléatoire (0.1 à 1.0)
            sizes[i] = Math.random() * 0.9 + 0.1;
        }

        return {positions, colors, sizes};
    }, []);

    return (
        <Points ref={pointsRef} positions={positions} colors={colors} sizes={sizes}>
            {/* Matériau des points */}
            <pointsMaterial
                size={0.5}
                vertexColors
                transparent
                opacity={0.8}
            />
        </Points>
    );

};


export const CircleComponent: React.FC<CircleProps> = ({
                                                           circleRadius,
                                                           mouse,
                                                           index,
                                                       }) => {
    const meshRef = useRef<Mesh>(null!);
    const [position, setPosition] = useState<[number, number, number]>([
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        0,
    ]);
    const velocityRef = useRef<[number, number]>([
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02,
    ]);

    // Animation Frame pour mettre à jour la position du cercle
    useFrame(() => {
        const [x, y, z] = position;
        const [vx, vy] = velocityRef.current;

        if (meshRef.current) {
            const newX = x + vx;
            const newY = y + vy;

            // Distance en 2D entre le centre du cercle et la souris
            const dx = mouse.x - newX;
            const dy = mouse.y - newY;

            let updatedX = newX;
            let updatedY = newY;

            // Redirection si le cercle sort des limites (-5, 5)
            if (updatedX > 5 || updatedX < -5) velocityRef.current[0] *= -1;
            if (updatedY > 5 || updatedY < -5) velocityRef.current[1] *= -1;

            // Mise à jour de la position
            setPosition([updatedX, updatedY, z]);
        }
    });

    return (
        <mesh ref={meshRef} position={position}>
            <circleGeometry args={[circleRadius, 32]}/>
            <meshBasicMaterial color="blue"/>
        </mesh>
    );
};

interface BackgroundColorProps {
    count?: number;
    circleRadius?: number;
    className?: string;
}

export const BackgroundColor: React.FC<BackgroundColorProps> = ({
                                                                    count = 20,
                                                                    circleRadius = 1,

                                                                    className = "",
                                                                }) => {
    const isClient = typeof window === "object";

    // Capture la position de la souris
    const mouse = isClient
        ? useMouse(document.querySelector("body")!, {
            fps: 30,
            enterDelay: 100,
            leaveDelay: 100,
        })
        : {x: 0, y: 0};

    let normalizedMouse: { x: number, y: number }
    if ("clientX" in mouse) {
        normalizedMouse = {
            x: (mouse?.clientX || 0) / window.innerWidth - 0.5,
            y: -((mouse?.clientY || 0) / window.innerHeight - 0.5),
        };
    }


    return (
        <div className={`h-full w-full absolute -z-10 ${className}`}>

            {/* Canvas contenant les cercles */}
            <Canvas

                // camera={{position: [0, 0, 10], fov: 75}}

            >

                <NebulaParticles/>
                {/*<EffectComposer>*/}
                {/*    <Bloom intensity={1.5} luminanceThreshold={0.1} luminanceSmoothing={0.9}/>*/}
                {/*</EffectComposer>*/}
                {/*{Array.from({length: count}).map((_, i) => (*/}
                {/*    <CircleComponent*/}
                {/*        key={i}*/}
                {/*        index={i}*/}
                {/*        circleRadius={circleRadius}*/}
                {/*        mouse={normalizedMouse}*/}
                {/*    />*/}
                {/*))}*/}
            </Canvas>
        </div>
    );
};