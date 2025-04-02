import {useEffect, useState} from "react";
import {Card, IconButton} from "@udixio/ui";
import {faCircleXmark} from "@fortawesome/pro-regular-svg-icons";
import type {AstroComponentFactory} from "astro/runtime/server";

type ProjectProps = {
    meta: {
        title: string;
        slug: string
        siteUrl?: string
        theme: {
            isDark: boolean;
        };
    };
    content: AstroComponentFactory
    media: {
        logo: { src: string, alt: string }
        background: { src: string, alt: string }
    }
};


export const Project = ({meta, media}: ProjectProps) => {
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
                        className="block !absolute z-10 w-fit  ml-auto right-0 m-4 top-4"
                        arialLabel="retour aux projets"
                        href={returnUrl}
            />

            <div className="h-full flex justify-center  items-center">
                <div className={"absolute top-0 left-0 flex items-center w-full h-full"}>
                    <img style={{
                        maskImage: "linear-gradient(180deg,rgba(0,0,0,1) 75%,rgba(0,0,0,0))"
                    }} className={"opacity-10"} src={media.background.src}/>
                </div>
                <img className={"z-10 max-w-screen-sm"} src={media.logo.src}/>


            </div>
            <iframe className={"w-full h-full"}
                    src={meta.siteUrl ?? "https://netsimpler.io/"}></iframe>
        </Card>


    </section>
}