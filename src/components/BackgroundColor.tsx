import React, {useMemo, useRef} from "react";
import {Canvas, useFrame} from "@react-three/fiber";
import useMouse from "@react-hook/mouse-position";
import {Points} from "@react-three/drei";

interface CircleProps {
    circleRadius: number;
    mouse: { x: number; y: number }; // Coordonnées de la souris (normalisées)
    index: number;
    canEscape?: boolean;
}


const NebulaParticles = ({count = 100}: { count?: number }) => {
    const pointsRef = useRef(null);

    // Génération des données pour les positions, couleurs et tailles
    const {positions, colors, sizes} = useMemo(() => {
        const numPoints = count; // Nombre total de points
        const positions = new Float32Array(numPoints * 3); // x, y, z pour chaque point
        const basePositions = new Float32Array(numPoints * 3); // Positions de base pour le parallaxe
        const colors = new Float32Array(numPoints * 3); // r, g, b pour chaque point
        const sizes = new Float32Array(numPoints); // Une taille par point

        for (let i = 0; i < numPoints; i++) {
            // Position aléatoire dans l'espace 3D (-5 à 5 pour chaque coordonnée)
            const x = (Math.random() - 0.5) * 10;
            const y = (Math.random() - 0.5) * 10;
            const z = (Math.random() - 0.5) * 5;

            basePositions[i * 3] = x;
            basePositions[i * 3 + 1] = y;
            basePositions[i * 3 + 2] = z;

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

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
                vertexColors
                transparent
                opacity={0.8}
                alphaTest={0.5}

            />
        </Points>
    );

};

interface BackgroundColorProps {
    count?: number;
    circleRadius?: number;
    className?: string;
}

const MouseControlledCamera = ({mouse}) => {
    const cameraRef = useRef(null);

    // Utilisation de useFrame pour déplacer la caméra à chaque frame
    useFrame(() => {
        if (cameraRef.current) {
            cameraRef.current.position.x += (mouse.x * 5 - cameraRef.current.position.x) * 0.05; // Lissage des mouvements
            cameraRef.current.position.y += (mouse.y * 5 - cameraRef.current.position.y) * 0.05;
            cameraRef.current.lookAt(0, 0, 0); // La caméra pointe toujours vers l'origine
        }
    });

    return <perspectiveCamera ref={cameraRef} position={[0, 0, 10]}/>;
};

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


            >

                <NebulaParticles/>
                <MouseControlledCamera mouse={normalizedMouse}/>

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