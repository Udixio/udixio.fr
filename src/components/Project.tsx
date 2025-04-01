import {faCircleXmark} from "@fortawesome/pro-regular-svg-icons";
import {Card, IconButton} from "@udixio/ui";
import {useEffect, useState} from "react";

type Props = {
    meta: {
        title: string
        slug: string
        siteUrl?: string
    }
    content: {
        body: string
    }
    media?: {
        logo?: string
        image?: string
    }
}


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
        <Card className="!rounded-[28px] max-width w-full h-full bg-surface-container-lowest"
              style={{viewTransitionName: "realisation-" + meta.slug}}>
            <IconButton variant='tonal' icon={faCircleXmark} className="block !absolute w-fit ml-auto right-0 m-4"
                        arialLabel="retour aux projets"
                        href={returnUrl}
            />
            {/*<div className="relative">*/}

            {/*    /!*<img className="rounded-[28px] w-full" src={realisation.data.image.src} height="1920" width="1080"/>*!/*/}
            {/*    /!*<div*!/*/}
            {/*    /!*    className={`w-full z-10 h-32 absolute bottom-0 bg-gradient-to-b left-0 from-transparent to-surface via-surface/[0.75]`}>*!/*/}
            {/*    /!*</div>*!/*/}
            {/*</div>*/}
            <div className="h-full flex justify-center  items-center">
                <h1 className="text-display-large mb-8 mt-8">{meta.title}</h1>
            </div>

        </Card>


    </section>
}