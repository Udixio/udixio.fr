import React, {useEffect, useMemo, useRef, useState} from "react";
import {CircleComponent} from "@components/CircleComponent.tsx";


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


export const BackgroundColor = ({count = 10, size = "75%", className}: {
    count?: number,
    size?: string,
    className?: string
}) => {

    // const mouse = useMouse(document.querySelector("body")!, {
    //     fps: 10,
    //     enterDelay: 100,
    //     leaveDelay: 100,
    // })


    const [colorSurface, setColorSurface] = useState<[x: number, y: number, z: number]>([18, 19, 24]);
    useEffect(() => {
        setColorSurface(getCSSVariableColor('surface'))
    }, [])


    // Génération des données pour les positions, couleurs et tailles
    const {positions} = useMemo(() => {
        const numPoints = count; // Nombre total de points
        const positions: { x: number, y: number }[] = [] // x, y, z pour chaque point


        for (let i = 0; i < numPoints; i++) {
            // Position aléatoire dans l'espace 3D (-5 à 5 pour chaque coordonnée)
            const x = (Math.random()) * 100;
            const y = (Math.random()) * 100;


            positions[i] = {
                x, y
            };


            // Couleur en utilisant la variable CSS 'primary' convertie en valeur hexadécimale

// Usage:
            // Couleur aléatoire

            // Taille aléatoire (0.1 à 1.0)
        }

        return {positions};
    }, []);

    const [colors, setColors] = useState<string[] | null>()

    useEffect(() => {
        const numPoints = count; // Nombre total de points
        const colors: string[] = []


        for (let i = 0; i < numPoints; i++) {

            const primary = i % 3 === 0 ? getCSSVariableColor('tertiary-container') : getCSSVariableColor('primary-container');


            const sensitivity = 0.6;

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


        setColors(colors)
    }, []);


    const updatedPositions = useRef(positions);
    const [animatedPositions, setAnimatedPositions] = useState<{ x: number, y: number }[]>(positions);

    const threshold = 4.5; // Distance minimale à laquelle les points sont "repoussés"

    // useEffect(() => {
    //     // Si la position de la souris n'est pas disponible, ne rien faire
    //     if (!mouse.clientX || !mouse.clientY) return;
    //
    //     // Conversion des coordonnées de la souris en espace 3D (fixe Z à 0)
    //     const mouse3D = new Vector3(
    //         (mouse.clientX / window.innerWidth) * 10 - 5, // X normalisé (-5 à 5)
    //         (mouse.clientY / window.innerHeight) * -10 + 5, // Y normalisé (-5 à 5)
    //         0 // Z constant (fixé à 0)
    //     );
    //
    //     // Mise à jour des positions des particules
    //     updatedPositions.current = positions.map(([x, y, z], index) => {
    //         const particle = new Vector3(x, y, 0);
    //
    //         // Taille de la particule : `sizes[index]` (ou une taille par défaut)
    //         const particleSize = size; // Taille par défaut si non défini
    //
    //
    //         const distance = particle.distanceTo(mouse3D);
    //
    //         // Vérifier si la particule est dans la zone d'interaction (seuil)
    //         if (distance < threshold) {
    //             // Calculer dans quelle direction repousser (uniquement en X et Y)
    //             const direction = particle
    //                 .clone()
    //                 .sub(mouse3D) // Direction opposée vers la souris
    //                 .normalize(); // Normaliser la direction
    //
    //             // Calcul du déplacement basé sur la taille : 2x la largeur de la particule
    //             const repelDistance = particleSize;
    //
    //             // Appliquer le déplacement, ralenti par la force (repelForce)
    //             return [
    //                 x + direction.x * repelDistance,// Nouvelle position X
    //                 y + direction.y * repelDistance, // Nouvelle position Y
    //                 z // Z reste inchangé
    //             ];
    //         }
    //
    //         // Si hors zone (distance >= threshold), aucune modification
    //         return [x, y, z];
    //     });
    // }, [mouse, positions, threshold]);


    return (

        <div className={className}>

            {Array.from({length: count}, (_, i) => {
                return (
                    <CircleComponent
                        index={i}
                        width={size}
                        key={i} // Une clé unique pour chaque élément
                        position={positions[i]} color={colors ? colors[i] : "dark"}/>
                )
            })}
        </div>
    );

};

interface BackgroundColorProps {
    count?: number;
    circleRadius?: number;
    className?: string;
}
