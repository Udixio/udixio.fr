import React, {useEffect, useMemo, useRef, useState} from "react";
import {useFrame} from "@react-three/fiber";
import {Point, Points} from "@react-three/drei";
import useMouse from "@react-hook/mouse-position";
import {AdditiveBlending, TextureLoader, Vector3} from "three";
import {lerp} from "@material/material-color-utilities";


const getColorHex = (colorSource: number[]): string => {
    return `#${Math.round(colorSource[0]).toString(16).padStart(2, '0')}${Math.round(colorSource[1]).toString(16).padStart(2, '0')}${Math.round(colorSource[2]).toString(16).padStart(2, '0')}`;
};

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


export const BackgroundColor = ({count = 10, size = 10}: { count?: number, size?: number }) => {

    const mouse = useMouse(document.querySelector("body")!, {
        fps: 10,
        enterDelay: 100,
        leaveDelay: 100,
    })


    const [colorSurface, setColorSurface] = useState<[x: number, y: number, z: number]>([18, 19, 24]);
    useEffect(() => {
        setColorSurface(getCSSVariableColor('surface'))
    }, []);


    // Génération des données pour les positions, couleurs et tailles
    const {positions, colors} = useMemo(() => {
        const numPoints = count; // Nombre total de points
        const positions: [x: number, y: number, z: number][] = [] // x, y, z pour chaque point
        const colors: string[] = []


        for (let i = 0; i < numPoints; i++) {
            // Position aléatoire dans l'espace 3D (-5 à 5 pour chaque coordonnée)
            const x = (Math.random() - 0.5) * 25;
            const y = (Math.random() - 0.5) * 15;
            const z = (Math.random()) * -5;


            positions[i] = [x, y, z];


            const primary = i % 3 === 0 ? getCSSVariableColor('tertiary-container') : getCSSVariableColor('primary-container');


            const sensitivity = 0.675;

            const colorSource = Array.from({length: 3}, (_, i) => {
                if (!colorSurface) {
                    throw new Error("An unexpected error occurred while calculating color values.");
                }

                const minColorPourcent = Math.max(
                    ...primary, // Éclate les valeurs de primary
                    ...colorSurface // Éclate les valeurs de surface
                ) / (255 * 3);


                const min = Math.min(primary[i], colorSurface[i]);
                const max = Math.max(primary[i], colorSurface[i]);


                const randomFactor = (1 - sensitivity) + Math.random() * (1 - (1 - sensitivity));


                // Ajuste le calcul de Math.random() en fonction de minColorPourcent
                return min + (minColorPourcent + randomFactor * (1 - minColorPourcent)) * (max - min);

            });

            // Couleur en utilisant la variable CSS 'primary' convertie en valeur hexadécimale

// Usage:
            // Couleur aléatoire
            colors[i] = getColorHex(colorSource); // Rougeconsole.log(colors[i])

            // Taille aléatoire (0.1 à 1.0)
        }

        return {positions, colors};
    }, []);

    const updatedPositions = useRef(positions);
    const [animatedPositions, setAnimatedPositions] = useState(positions);

    const threshold = 4.5; // Distance minimale à laquelle les points sont "repoussés"

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
            const particle = new Vector3(x, y, 0);

            // Taille de la particule : `sizes[index]` (ou une taille par défaut)
            const particleSize = size; // Taille par défaut si non défini


            const distance = particle.distanceTo(mouse3D);

            // Vérifier si la particule est dans la zone d'interaction (seuil)
            if (distance < threshold) {
                // Calculer dans quelle direction repousser (uniquement en X et Y)
                const direction = particle
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
    }, [mouse, positions, threshold]);

    useFrame((_state, delta) => {

        if (!mouse.isOver) {
            return
        }

        const positions = animatedPositions.map((animated, i) => {
            const target = updatedPositions.current[i];
            return animated.map((coord, axis) => {
                    // Interpolation vers la nouvelle position
                    return lerp(coord, target[axis], delta / 0.75)
                }
            ) as [number, number, number]
        });

        setAnimatedPositions(positions)
    });

    const svgCircleTexture = useMemo(() => {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
      <radialGradient id="grad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
        <stop offset="0%" style="stop-color:rgb(255,255,255);stop-opacity:1" />
        <stop offset="50%" style="stop-color:rgb(191,191,191);stop-opacity:1" />
        <stop offset="100%" style="stop-color:rgb(${colorSurface.toString()});stop-opacity:1" />
      </radialGradient>
      <circle cx="128" cy="128" r="128" fill="url(#grad)" />
    </svg>`;

        return new TextureLoader().load(`data:image/svg+xml;base64,${btoa(svg)}`);
    }, [colorSurface]);


    return (

        <Points
        >
            <pointsMaterial
                vertexColors
                transparent
                opacity={.75}
                size={size}
                map={svgCircleTexture}
                blending={AdditiveBlending} // Blending additif

                depthWrite={false} // Empêche l'écriture dans le buffer de profondeur pour un meilleur rendu

            />
            {Array.from({length: count}, (_, i) => {
                return (
                    <Point

                        key={i} // Une clé unique pour chaque élément
                        position={animatedPositions[i]} color={colors[i]}/>
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
