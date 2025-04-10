import React, {useMemo, useRef} from "react";
import {useFrame} from "@react-three/fiber";

import {PointMaterial, Points} from "@react-three/drei";
import {TextureLoader} from "three";

export const BackgroundStar: React.FC<{ count?: number; radius?: number }> = ({count = 200, radius = 5}) => {
    const pointsRef = useRef<any>(null);
    const groupRef = useRef<any>(null);

    // Générer aléatoirement des positions pour les étoiles
    const positions = useMemo(() => {
        const positionsArray: number[] = [];
        const scale = 3.5;
        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * 10 * scale;
            const y = (Math.random() - 0.5) * 10 * scale;
            const z = ((Math.random() - 0.5) * 10 * scale);

            positionsArray.push(x, y, z);
        }
        return new Float32Array(positionsArray);
    }, [count, radius]);

    // Ajouter un léger mouvement dans les étoiles pour donner de la vie en animation
    useFrame(() => {
        if (groupRef.current) {
            // Effectuer la rotation autour de y = -5 du groupe contenant les étoiles
            pointsRef.current.rotation.y += 0.0005;
            groupRef.current.scale.set(1, 1, 0.3); //

        }
    });


    const svgStarTexture = useMemo(() => {
        const svg = `<svg width="350" height="350" viewBox="0 0 350 350" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M122 227.999C82.9999 188.999 0 174.999 0 174.999C0 174.999 82.4994 161.084 121.646 122.353C121.764 122.235 121.883 122.118 122 122C161.001 82.9997 175 0 175 0C175 0 189 83 228 122C267 161 349.999 174.999 349.999 174.999C349.999 174.999 266.999 188.999 227.999 227.999C188.999 267 175 349.999 175 349.999C175 349.999 161.085 267.5 122.353 228.354C122.235 228.235 122.118 228.117 122 227.999Z" fill="white"/>
</svg>
`
        ;

        return new TextureLoader().load(`data:image/svg+xml;base64,${btoa(svg)}`);
    }, []);
    return (
        <group ref={groupRef} position={[0, 0, -5]}>

            <Points positions={positions} ref={pointsRef}>
                <PointMaterial
                    size={0.175}
                    sizeAttenuation
                    depthWrite={false}
                    map={svgStarTexture}
                    color="#ffffff"
                    transparent
                    opacity={1}
                />
            </Points>
        </group>

    );
};




