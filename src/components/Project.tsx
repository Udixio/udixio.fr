import {faCircleXmark} from "@fortawesome/pro-regular-svg-icons";
import {Card, IconButton} from "@udixio/ui";
import {useEffect, useRef, useState} from "react";
import {Canvas, useFrame} from "@react-three/fiber";
import {PointMaterial, Points} from "@react-three/drei";

type Props = {
    meta: {
        title: string
        slug: string
        siteUrl?: string
        theme: {
            isDark: boolean
            source: string
        }
    }
    content: {
        body: string
    }
    media?: {
        logo?: string
        image?: string
    }
}

type SpaceBackgroundProps = {
    mode: "light" | "dark";
    title: string;
};

// Composant pour gérer les particules (étoiles)
const SpaceParticles = ({lightMode}: { lightMode: boolean }) => {
    const ref = useRef(null);
    const particlesCount = 5000;

    // Génération des étoiles
    const positions = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount * 3; i++) {
        positions[i] = (Math.random() - 0.5) * 10; // Étendre les étoiles dans l'espace
    }

    useFrame(({mouse}) => {
        if (ref.current) {
            ref.current.rotation.x = -mouse.y * 0.02; // Réagir légèrement au déplacement de la souris
            ref.current.rotation.y = mouse.x * 0.02;
        }
    });

    return (
        <Points ref={ref} positions={positions} stride={3} frustumCulled>
            <PointMaterial
                transparent
                color={lightMode ? "#000000" : "#FFFFFF"} // Blanc pour le mode dark, noir pour le mode light
                size={0.04}
                sizeAttenuation
                depthWrite={false}
            />
        </Points>
    );
};


export const Project = ({meta}: Props) => {
    const [returnUrl, setReturnUrl] = useState<string>("/nos-realisations");


    useEffect(() => {

        const referrer = document.referrer;

        // Vérifier que le referrer est différent de l'URL actuelle et s'il est valide
        if (referrer && referrer !== window.location.href) {
            setReturnUrl(referrer);
        }
    }, []);


    return <section id="projets"
                    className=" tab-menu h-screen pt-32 flex items-center relative padding ">
        <Card className="!rounded-[28px] max-width w-full !overflow-auto h-full bg-surface-container-lowest"
              style={{viewTransitionName: "realisation-" + meta.slug}}>
            <IconButton variant='tonal' icon={faCircleXmark}
                        className="block !sticky z-10 w-fit float-right ml-auto right-0 m-4 top-4"
                        arialLabel="retour aux projets"
                        href={returnUrl}
            />

            <div className="h-full flex justify-center  items-center">
                <div className={"absolute top-0 left-0 w-full h-full"}>
                    <Canvas>
                        <SpaceParticles lightMode={!meta.theme.isDark}/>
                    </Canvas>
                </div>
                <h1 className="text-display-large mb-8 mt-8">{meta.title}</h1>

            </div>
            <iframe className={"w-full h-full"}
                    src={meta.siteUrl ?? "https://netsimpler.io/"}></iframe>
        </Card>


    </section>
}