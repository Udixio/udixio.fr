import {Button, Card, Divider, IconButton} from "@udixio/ui";
import {faLink, faXmark} from "@fortawesome/pro-regular-svg-icons";
import type {CollectionEntry} from "astro:content";
import type {ReactNode} from "react";

type Props = CollectionEntry<"realisation">['data'] & {
    slug: string,
    images: {
        background: {
            src: string
        }
    }
    technologies?: ReactNode,
    services?: ReactNode,
    body: ReactNode,
    sidebar: ReactNode
}

export const Project = ({slug, images, title, services, technologies, website, summary, sidebar, body}: Props) => {
    return (
        <Card className="!rounded-[28px] !overflow-auto max-width w-full bg-surface-container-lowest"
              style={{viewTransitionName: "realisation-" + slug}}>
            <IconButton variant='outlined' icon={faXmark}
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
                        className={"absolute top-0 left-0 flex items-center w-full h-full bg-gradient-to-b from-primary/30 to-transparent"}>
                        <img style={{
                            maskImage: "linear-gradient(180deg,rgba(0,0,0,1) 75%,rgba(0,0,0,0))"
                        }} className={"opacity-[.07] w-full object-cover h-full"} src={images.background.src}/>
                    </div>
                    {
                        images.logo?.src &&
                        <img className={"z-10 max-w-screen-sm"} src={images.logo.src}/>
                    }
                    {
                        !(images.logo?.src) &&
                        <p className={"text-display-medium text-center max-w-screen-md mx-auto"}>{title}</p>
                    }
                </div>
                <p className={"text-display-small text-center max-w-screen-md mx-auto"}>{summary}</p>
                <div className={"flex mt-32 h-full gap-4"}>
                    <div className={"left w-fit !max-w-sm padding-x "}>
                        <div className="prose-markdown">
                            {sidebar}
                        </div>
                        <div className="flex flex-col gap-12">
                            {services &&
                                <div>
                                    <p className="text-headline-small uppercase m-2">Services</p>
                                    <div className="flex flex-wrap">
                                        {services}
                                    </div>

                                </div>}
                            {technologies &&
                                <div>
                                    <p className="text-headline-small uppercase mb-2">Technologies</p>
                                    <div className="flex flex-wrap">
                                        {technologies}
                                    </div>

                                </div>}
                            {website &&
                                <Button className="w-fit" target="_blank" href={website} icon={faLink}
                                        label={"Visiter le siteWeb"}/>}
                        </div>


                    </div>
                    <Divider orientation={"vertical"}/>
                    <div className={"flex-1 right padding-x pb-12"}>
                        <div className={"prose-markdown px-4"}>
                            {body}
                            {website && <h2 className={"uppercase"}>Aperçu du Site</h2>}


                        </div>
                        {website &&
                            <video className={"w-full mt-8 rounded-2xl"} autoplay muted loop playsinline>
                                <source src={"/videos/renders/" + slug + "-720.webm"} type="video/webm"/>
                                Votre navigateur ne supporte pas l'élément vidéo.
                            </video>}


                    </div>

                </div>


            </div>


        </Card>
    );
}