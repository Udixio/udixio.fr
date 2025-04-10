import React, {useRef} from "react";
import useMouse from "@react-hook/mouse-position";
import {useFrame} from "@react-three/fiber";
import {PerspectiveCamera} from "@react-three/drei";

export const ControlledCamera: React.FC = ({canvasRef}: { canvasRef: React.RefObject<HTMLDivElement | null> }) => {
    const cameraRef = useRef<PerspectiveCamera | null>(null);

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


