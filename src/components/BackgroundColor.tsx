import React, {useRef, useState} from "react";
import {Canvas, useFrame} from "@react-three/fiber";
import useMouse from "@react-hook/mouse-position";

interface CircleProps {
    circleRadius: number;
    mouse: { x: number; y: number }; // Coordonnées de la souris (peuvent être adaptées)
    index: number;
    canEscape?: boolean;
}

export const CircleComponent: React.FC<CircleProps> = ({
                                                           circleRadius,
                                                           mouse,
                                                           index,
                                                           canEscape = true,
                                                       }) => {
    const meshRef = useRef<THREE.Mesh>(null!);
    const [position, setPosition] = useState<[number, number, number]>([
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        0,
    ]);
    const [isAngry, setIsAngry] = useState(false);

    const velocityRef = useRef<[number, number]>([
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02,
    ]);

    // Animation Frame pour mettre à jour la position du cercle
    useFrame(() => {
        // Vérification des limites de l'écran ou de la scène
        const [x, y, z] = position;
        const [vx, vy] = velocityRef.current;

        if (meshRef.current) {
            // Déplace et met à jour la position
            const newX = x + vx;
            const newY = y + vy;

            // Logique pour faire "échapper" le cercle si proche de la souris
            const dx = mouse.x - newX;
            const dy = mouse.y - newY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            let updatedX = newX;
            let updatedY = newY;

            if (canEscape && distance < circleRadius * 0.5) {
                const escapeSpeed = 0.1; // Vitesse d'évitement
                updatedX -= dx / distance * escapeSpeed;
                updatedY -= dy / distance * escapeSpeed;
                setIsAngry(true);
            } else {
                setIsAngry(false);
            }

            // Rediriger si les cercles sortent des limites (-5, 5)
            if (updatedX > 5 || updatedX < -5) velocityRef.current[0] *= -1;
            if (updatedY > 5 || updatedY < -5) velocityRef.current[1] *= -1;

            setPosition([updatedX, updatedY, z]);
        }
    });

    return (
        <mesh ref={meshRef} position={position}>
            <circleGeometry args={[circleRadius, 32]}/>
            <meshBasicMaterial color={isAngry ? "red" : "blue"}/>
        </mesh>
    );
};

interface BackgroundColorProps {
    count?: number;
    circleRadius?: number;
    canEscape?: boolean;
    className?: string;
}


export const BackgroundColor: React.FC<BackgroundColorProps> = ({
                                                                    count = 20,
                                                                    circleRadius = 1,
                                                                    canEscape = true,
                                                                    className = "",
                                                                }) => {
    const isClient = typeof window === "object";

    // Capture la position de la souris (nécessite un DOM)
    const mouse = isClient
        ? useMouse(document.querySelector("body")!, {
            fps: 30,
            enterDelay: 100,
            leaveDelay: 100,
        })
        : {x: 0, y: 0}; // Position par défaut si non supporté.

    let normalizedMouse: { x: number, y: number }
    if ("clientX" in mouse) {
        normalizedMouse = {
            x: (mouse?.clientX || 0) / window.innerWidth - 0.5,
            y: -((mouse?.clientY || 0) / window.innerHeight - 0.5),
        };
    }

    return (
        <div className={`h-full w-full absolute -z-10 ${className}`}>
            <Canvas>
                {Array.from({length: count}).map((_, i) => (
                    <CircleComponent
                        key={i}
                        index={i}
                        circleRadius={circleRadius}
                        mouse={normalizedMouse}
                        canEscape={canEscape}
                    />
                ))}
            </Canvas>
        </div>
    );
};
