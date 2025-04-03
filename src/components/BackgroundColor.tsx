import React, {useMemo, useRef} from "react";
import {Canvas, useFrame} from "@react-three/fiber";
import {PerspectiveCamera, Point, Points} from "@react-three/drei";
import useMouse from "@react-hook/mouse-position";
import {Bloom, DepthOfField, EffectComposer} from "@react-three/postprocessing";
import {AdditiveBlending} from "three";

interface CircleProps {
    circleRadius: number;
    mouse: { x: number; y: number }; // Coordonnées de la souris (normalisées)
    index: number;
    canEscape?: boolean;
}


const NebulaParticles = ({count = 25}: { count?: number }) => {


    // Génération des données pour les positions, couleurs et tailles
    const {positions, colors, sizes} = useMemo(() => {
        const numPoints = count; // Nombre total de points
        const positions: [x: number, y: number, z: number][] = [] // x, y, z pour chaque point
        const colors: [r: number, g: number, b: number][] = []
        const sizes: Float32Array = new Float32Array(numPoints); // Une taille par point

        for (let i = 0; i < numPoints; i++) {
            // Position aléatoire dans l'espace 3D (-5 à 5 pour chaque coordonnée)
            const x = (Math.random() - 0.5) * 10;
            const y = (Math.random() - 0.5) * 10;
            const z = (Math.random() - 0.5) * 5;


            positions[i] = [x, y, z];

            // Couleur aléatoire
            colors[i] = [Math.random(), Math.random(), Math.random()]; // Rouge

            // Taille aléatoire (0.1 à 1.0)
            sizes[i] = (Math.random() * 5 + 0.1);
        }

        return {positions, colors, sizes};
    }, []);


    return (

        <Points
        >
            <pointsMaterial
                vertexColors
                transparent
                opacity={1}
                alphaTest={0.5}
                blending={AdditiveBlending}
                size={1.5}
            />
            {Array.from({length: count}, (_, i) => {
                console.log(positions[i])
                return (
                    <Point

                        key={i} // Une clé unique pour chaque élément
                        position={positions[i]} color={colors[i]}/>
                )
            })}
        </Points>
    );

};

interface BackgroundColorProps {
    count?: number;
    circleRadius?: number;
    className?: string;
}

const MouseControlledCamera: React.FC = ({canvasRef}: { canvasRef: React.RefObject<HTMLDivElement | null> }) => {
    const cameraRef = useRef<THREE.PerspectiveCamera>(null);

    const mouse = useMouse(document.querySelector("body")!, {
        fps: 30,
        enterDelay: 100,
        leaveDelay: 100,
    });

    useFrame(() => {
        // Obtenez la zone du canvas dans la page
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (!canvasRect || !cameraRef.current) return;

        // Obtenez les coordonnées de la souris à l'intérieur du canvas
        const mouseX = mouse.clientX
        const mouseY = mouse.clientY

        const normalizedMouse = {
            x: ((mouseX - canvasRect.left) / canvasRect.width - 0.5) * 2, // Normalisation par rapport au centre du canvas
            y: -((mouseY - canvasRect.top) / canvasRect.height - 0.5) * 2,
        };


        // Mise à jour fluide de la position de la caméra
        cameraRef.current.position.x += (normalizedMouse.x * 5 - cameraRef.current.position.x) * 0.05;
        cameraRef.current.position.y += (normalizedMouse.y * 5 - cameraRef.current.position.y) * 0.05;

        // La caméra reste centrée sur la scène
        cameraRef.current.lookAt(0, 0, 0);
    });

    return (

        <PerspectiveCamera
            makeDefault
            ref={cameraRef}
            position={[0, 0, 5]} // Placez la caméra à une distance raisonnable
            fov={75}
            near={0.1}
            far={1000}

        />

    );
};


export const BackgroundColor: React.FC<BackgroundColorProps> = ({
                                                                    count = 20,
                                                                    circleRadius = 1,

                                                                    className = "",
                                                                }) => {
    const canvasRef = useRef<HTMLDivElement>(null); // Référence pour le conteneur du `Canvas`


    return (
        <div ref={canvasRef} className={`h-full w-full absolute -z-10 ${className}`}>

            <Canvas>


                <MouseControlledCamera canvasRef={canvasRef}/>
                {/* Exemples de contenu (ajoutez les vôtres ici) */}
                <NebulaParticles/>

                <EffectComposer>
                    <Bloom
                        intensity={1.2}               // Flou à intensité modérée
                        luminanceThreshold={0.0}       // Appliquer à tous les niveaux de luminance des points
                        luminanceSmoothing={0.5}       // Flou progressif et doux
                        radius={1.5}                   // Augmenter la diffusion pour accentuer le flou
                    />


                    <DepthOfField
                        focusDistance={8.0}   // Mise au point très, très loin
                        focalLength={1.5}     // Longueur focale énorme pour une sensation d'extrême flou
                        bokehScale={20.0}     // Bokehs extrêmement massifs
                    />


                </EffectComposer>


                <ambientLight intensity={0.5}/>
                <directionalLight position={[10, 10, 5]} intensity={1}/>


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