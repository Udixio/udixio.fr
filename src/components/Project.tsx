import {Canvas, useFrame} from "@react-three/fiber";
import {useEffect, useMemo, useRef, useState} from "react";
import {PointMaterial, Points} from "@react-three/drei";
import {Card, IconButton} from "@udixio/ui";
import {faCircleXmark} from "@fortawesome/pro-regular-svg-icons";

type ProjectProps = {
    meta: {
        title: string;
        slug: string
        siteUrl?: string
        theme: {
            isDark: boolean;
        };
    };
    content: {
        body: string
    }
    media?: {
        logo?: string
        image?: string
    }
};

const SpaceParticles = ({isDark}: { isDark: boolean }) => {
    const ref = useRef<Points>(null);
    const particlesCount = 6000;

    // Création unique des positions pour éviter les recalculs
    const positions = useMemo(() => {
        const posArray = new Float32Array(particlesCount * 3);
        for (let i = 0; i < particlesCount * 3; i++) {
            posArray[i] = (Math.random() - 0.5) * 15;
        }
        return posArray;
    }, []);

    // Animation fluide et interactive
    useFrame(({mouse}) => {
        if (ref.current) {
            ref.current.rotation.x += (mouse.y * 0.01 - ref.current.rotation.x) * 0.05;
            ref.current.rotation.y += (mouse.x * 0.01 - ref.current.rotation.y) * 0.05;
        }
    });

    return (
        <Points ref={ref} positions={positions} stride={3} frustumCulled>
            <PointMaterial
                transparent
                color={isDark ? "#ffffff" : "#222222"}
                size={0.05}
                sizeAttenuation
                depthWrite={false}
            />
        </Points>
    );
};


export const Project = ({meta}: ProjectProps) => {
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