import React, {useEffect, useMemo, useRef} from "react";
import {Canvas, useFrame} from "@react-three/fiber";
import {PerspectiveCamera, Point, Points} from "@react-three/drei";
import useMouse from "@react-hook/mouse-position";
import {NoToneMapping, Vector3} from "three";

interface CircleProps {
    circleRadius: number;
    mouse: { x: number; y: number }; // Coordonnées de la souris (normalisées)
    index: number;
    canEscape?: boolean;
}

function getCSSVariableColor(variableName: string): [number, number, number] {
    const style = getComputedStyle(document.documentElement); // Récupère les styles de `:root`
    const color = style.getPropertyValue('--colors-' + variableName).trim(); // Récupère la valeur de la variable

    // Convertir la couleur CSS hexadécimale (par ex. #ff6347) en [r, g, b]
    const rgbMatch = color.split(' ')


    if (rgbMatch) {
        return rgbMatch
    }

    console.warn(`La variable CSS '${variableName}' contient une valeur non valide : '${color}'`);
    return [1, 1, 1]; // Retourne blanc par défaut en cas d'erreur
}


const NebulaParticles = ({count = 15, size = 2.25}: { count?: number, size?: number }) => {

    const mouse = useMouse(document.querySelector("body")!, {
        fps: 30,
        enterDelay: 100,
        leaveDelay: 100,
    });


    // Génération des données pour les positions, couleurs et tailles
    const {positions, colors} = useMemo(() => {
        const numPoints = count; // Nombre total de points
        const positions: [x: number, y: number, z: number][] = [] // x, y, z pour chaque point
        const colors: string[] = []


        for (let i = 0; i < numPoints; i++) {
            // Position aléatoire dans l'espace 3D (-5 à 5 pour chaque coordonnée)
            const x = (Math.random() - 0.5) * 10;
            const y = (Math.random() - 0.5) * 10;
            const z = (Math.random() - 0.5) * 5;


            positions[i] = [x, y, z];


            const primary = getCSSVariableColor('primary-container')
            const surface = getCSSVariableColor('surface')


            // const colorSource = [
            //     primary[0] + Math.random() * Math.abs(surface[0] - primary[0]),
            //     primary[1] + Math.random() * Math.abs(surface[1] - primary[1]),
            //     primary[2] + Math.random() * Math.abs(surface[2] - primary[2]),
            // ];


            const sensitivity = 0.675;

            const colorSource = Array.from({length: 3}, (_, i) => {
                const minColorPourcent = Math.max(
                    ...primary, // Éclate les valeurs de primary
                    ...surface  // Éclate les valeurs de surface
                ) / (255 * 3);


                const min = Math.min(primary[i], surface[i]);
                const max = Math.max(primary[i], surface[i]);

                const randomFactor = (1 - sensitivity) + Math.random() * (1 - (1 - sensitivity));


                // Ajuste le calcul de Math.random() en fonction de minColorPourcent
                return min + (minColorPourcent + randomFactor * (1 - minColorPourcent)) * (max - min);

            });

            // Couleur en utilisant la variable CSS 'primary' convertie en valeur hexadécimale
            const colorHex = `#${Math.round(colorSource[0]).toString(16).padStart(2, '0')}${Math.round(colorSource[1]).toString(16).padStart(2, '0')}${Math.round(colorSource[2]).toString(16).padStart(2, '0')}`;

            // Couleur aléatoire
            colors[i] = colorHex; // Rouge

            // Taille aléatoire (0.1 à 1.0)
        }

        return {positions, colors};
    }, []);

    const updatedPositions = useRef(positions);


    const threshold = 3; // Distance minimale à laquelle les points sont "repoussés"
    const repelForce = 0.75; // Force utilisée pour ralentir l'éloignement (plus petit pour être plus lent)

    useEffect(() => {
        // Si la position de la souris n'est pas disponible, ne rien faire
        if (!mouse.clientX || !mouse.clientY) return;

        // Conversion des coordonnées de la souris en espace 3D (fixe Z à 0)
        const mouse3D = new Vector3(
            (mouse.clientX / window.innerWidth) * 10 - 5, // X normalisé (-5 à 5)
            (mouse.clientY / window.innerHeight) * -10 + 5, // Y normalisé (-5 à 5)
            0 // Z constant (fixé à 0)
        );

        // Mise à jour des positions des particules
        updatedPositions.current = positions.map(([x, y, z], index) => {
            const particle = new Vector3(x, y, z);

            // Taille de la particule : `sizes[index]` (ou une taille par défaut)
            const particleSize = size; // Taille par défaut si non défini

            // Ignorer Z pour le calcul de la distance
            const projectedParticle = particle.clone();
            projectedParticle.z = 0; // Z forcé à 0 uniquement pour le calcul de distance

            const distance = projectedParticle.distanceTo(mouse3D);

            // Vérifier si la particule est dans la zone d'interaction (seuil)
            if (distance < threshold) {
                // Calculer dans quelle direction repousser (uniquement en X et Y)
                const direction = projectedParticle
                    .clone()
                    .sub(mouse3D) // Direction opposée vers la souris
                    .normalize(); // Normaliser la direction

                // Calcul du déplacement basé sur la taille : 2x la largeur de la particule
                const repelDistance = particleSize;

                // Appliquer le déplacement, ralenti par la force (repelForce)
                return [
                    x + direction.x * repelDistance,// Nouvelle position X
                    y + direction.y * repelDistance, // Nouvelle position Y
                    z // Z reste inchangé
                ];
            }

            // Si hors zone (distance >= threshold), aucune modification
            return [x, y, z];
        });
    }, [mouse, positions, threshold, repelForce]);


    return (

        <Points
        >
            <pointsMaterial
                vertexColors
                transparent
                opacity={.8}
                size={size}
            />
            {updatedPositions.current.map((position, i) => (
                <Point key={i} position={position} color={colors[i]}/>
            ))}

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

    const lastMouseRef = useRef({x: 0, y: 0}); // Par défaut, considéré comme au centre (0, 0)


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
        let mouseX = lastMouseRef.current.x; // Par défaut, centre
        let mouseY = lastMouseRef.current.y; // Par défaut, centre


        if (mouse.x && mouse.y) {
            mouseX = mouse.clientX ?? lastMouseRef.current.x;
            mouseY = mouse.clientY ?? lastMouseRef.current.y;

            // Met à jour la ref avec les nouvelles coordonnées
            lastMouseRef.current = {x: mouseX, y: mouseY};
        }

        const normalizedMouse = {
            x: ((mouseX - canvasRect.left) / canvasRect.width - 0.5) * 2, // Normalisation par rapport au centre du canvas
            y: -((mouseY - canvasRect.top) / canvasRect.height - 0.5) * 2,
        };

        // Ajuster la sensibilité de la caméra :
        const sensitivity = 5; // Réduit l'impact des mouvements de la souris (5 = plus sensible, 2 = moins sensible)
        const interpolationSpeed = 0.01; // Modifier pour ralentir ou accélérer les mouvements (0.05 = rapide, 0.02 = fluide et lent)


        // Mise à jour fluide de la position de la caméra
        cameraRef.current.position.x +=
            (normalizedMouse.x * sensitivity - cameraRef.current.position.x) *
            interpolationSpeed;
        cameraRef.current.position.y +=
            (normalizedMouse.y * sensitivity - cameraRef.current.position.y) *
            interpolationSpeed;

        // La caméra reste centrée sur la scène
        cameraRef.current.lookAt(0, 0, 0);

    });

    return (

        <PerspectiveCamera
            makeDefault
            ref={cameraRef}
            position={[0, 0, 5]} // Placez la caméra à une distance raisonnable
            fov={70}
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
        <div ref={canvasRef} className={`h-full  w-full absolute -z-10 ${className}`}>

            <Canvas
                gl={{toneMapping: NoToneMapping}}

            >


                <MouseControlledCamera canvasRef={canvasRef}/>
                {/* Exemples de contenu (ajoutez les vôtres ici) */}
                <NebulaParticles/>

                {/*<EffectComposer>*/}
                {/*    <Bloom*/}
                {/*        intensity={1.2}               // Flou à intensité modérée*/}
                {/*        luminanceThreshold={0.0}       // Appliquer à tous les niveaux de luminance des points*/}
                {/*        luminanceSmoothing={0.5}       // Flou progressif et doux*/}
                {/*        radius={1.5}                   // Augmenter la diffusion pour accentuer le flou*/}
                {/*    />*/}


                {/*    <DepthOfField*/}
                {/*        focusDistance={8.0}   // Mise au point très, très loin*/}
                {/*        focalLength={1.5}     // Longueur focale énorme pour une sensation d'extrême flou*/}
                {/*        bokehScale={20.0}     // Bokehs extrêmement massifs*/}
                {/*    />*/}


                {/*</EffectComposer>*/}


                {/*<ambientLight intensity={0.5}/>*/}
                {/*<directionalLight position={[10, 10, 5]} intensity={1}/>*/}


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