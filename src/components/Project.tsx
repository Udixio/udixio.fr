import {type ReactNode} from "react";
import {Button, Card, Divider, IconButton} from "@udixio/ui";
import {faCircleXmark, faLink} from "@fortawesome/pro-regular-svg-icons";


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

    return <section id="projets"
                    className=" tab-menu  pt-32 flex items-center relative padding ">
        <Card className="!rounded-[28px] !overflow-auto max-width w-full bg-surface-container-lowest"
              style={{viewTransitionName: "realisation-" + slug}}>
            <IconButton variant='tonal' icon={faCircleXmark}
                        className="block !absolute z-10 w-fit  ml-auto right-0 m-4 top-4 primary"
                        arialLabel="retour aux projets"
                        onClick={() => {
                            const referrer = document.referrer;
                            const currentDomain = window.location.origin; // Le domaine actuel, ex : "https://mon-site.com"

                            if (referrer && referrer.startsWith(currentDomain)) {
                                // Si le referrer appartient au même site, utiliser l'historique pour revenir en arrière
                                window.history.back();
                            } else {
                                // Sinon, rediriger vers la page par défaut
                                window.location.href = "/nos-realisations";
                            }
                        }}


            />

            <div className={" w-full h-full"}>
                <div className="min-h-[75vh] relative flex justify-center  items-center">
                    <div
                        className={"absolute top-0 left-0 flex items-center w-full h-full bg-gradient-to-b from-primary/50 to-transparent"}>
                        <img style={{
                            maskImage: "linear-gradient(180deg,rgba(0,0,0,1) 75%,rgba(0,0,0,0))"
                        }} className={"opacity-[.07] w-full object-cover h-full"} src={images.background.src}/>
                    </div>
                    {
                        images.logo?.src &&
                        <img className={"z-10 max-w-screen-sm"} src={images.logo.src}/>
                    }
                </div>
                <p className={"text-display-small text-center max-w-screen-md mx-auto"}>{summary}</p>
                <div className={"flex mt-16 h-full gap-4"}>
                    <div className={"w-fit max-w-sm padding-x"}>
                        <div className={"sticky top-0"}>
                            <Button icon={faLink} label={"Visiter le siteWeb"}/>
                        </div>

                    </div>
                    <Divider orientation={"vertical"}/>
                    <div className={"flex-1 padding-x pb-12"}>
                        <div className={"prose-markdown px-4"}>
                            {children}
                            <h2 className={""}>Aperçu du Site</h2>


                        </div>
                        <video className={"w-full mt-8 rounded-2xl"} autoPlay muted loop playsInline>
                            <source src="/videos/renders/netsimpler-720.webm" type="video/webm"/>
                            Votre navigateur ne supporte pas l'élément vidéo.
                        </video>

                    </div>

                </div>


            </div>


        </Card>


    </section>
}