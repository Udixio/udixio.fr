import {type ReactNode, useEffect, useState} from "react";
import {Card, IconButton} from "@udixio/ui";
import {faCircleXmark} from "@fortawesome/pro-regular-svg-icons";

type ProjectProps = {
    slug: string
    title: string,
    description: string,
    order?: number,
    theme: {
        isDark: boolean,
        source: string,
    },
    images: {
        background: {
            src: string,
            alt: string,
        },
        logo?: {
            src: string,
            alt: string,
        },
    },
    website?: string,
    summary: string
    children?: ReactNode,
};


export const Project = ({title, description, order, theme, images, slug, website, summary, children}: ProjectProps) => {
    const [returnUrl, setReturnUrl] = useState<string>("/nos-realisations");


    useEffect(() => {

        const referrer = document.referrer;

        // Vérifier que le referrer est différent de l'URL actuelle et s'il est valide
        if (referrer && referrer !== window.location.href) {
            setReturnUrl(referrer);
        }
    }, []);


    return <section id="projets"
                    className=" tab-menu  pt-32 flex items-center relative padding ">
        <Card className="!rounded-[28px] !overflow-auto max-width w-full bg-surface-container-lowest"
              style={{viewTransitionName: "realisation-" + slug}}>
            <IconButton variant='tonal' icon={faCircleXmark}
                        className="block !absolute z-10 w-fit  ml-auto right-0 m-4 top-4"
                        arialLabel="retour aux projets"
                        href={returnUrl}
            />

            <div className={" w-full h-full"}>
                <div className="min-h-[75vh] relative flex justify-center  items-center">
                    <div className={"absolute top-0 left-0 flex items-center w-full h-full"}>
                        <img style={{
                            maskImage: "linear-gradient(180deg,rgba(0,0,0,1) 75%,rgba(0,0,0,0))"
                        }} className={"opacity-10"} src={images.background.src}/>
                    </div>
                    {
                        images.logo?.src &&
                        <img className={"z-10 max-w-screen-sm"} src={images.logo.src}/>
                    }
                </div>
                <p className={"text-display-small text-center max-w-screen-md mx-auto"}>{summary}</p>
                <div className={"flex mt-16 min-h-[100vh] h-full"}>
                    <div className={"w-full max-w-sm"}>

                    </div>
                    <div className={"flex-1 prose-markdown"}>
                        {children}
                    </div>
                </div>


            </div>


            <div
                className={`w-full border-b z-10 h-32 absolute bottom-0 bg-gradient-to-b left-0 from-transparent to-surface via-surface/[0.50]`}>
            </div>
        </Card>


    </section>
}