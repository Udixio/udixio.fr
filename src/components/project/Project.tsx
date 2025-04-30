import {Button, Card, classNames, Divider, IconButton} from "@udixio/ui";
import {faArrowRight, faLink, faXmark} from "@fortawesome/pro-regular-svg-icons";
import type {CollectionEntry} from "astro:content";
import type {ReactNode} from "react";
import {useState} from "react";
import {AnimatePresence, motion} from "framer-motion";

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
    view?: "mini" | "full";

}

export const Project = (props: Props) => {

    const [isHovered, setHovered] = useState(false);

    const {slug, images, title, services, technologies, website, summary, sidebar, body, view = "full"} = props
    return (
        <Card
            isInteractive={view == "mini"}
            className={
                classNames({
                    " flex flex-col h-full group bg-surface/60 backdrop-blur transition-all duration-300 !rounded-2xl": view == "mini",
                    "!rounded-[28px] !overflow-auto max-width w-full bg-surface-container-lowest": view == "full"
                })
            }
            style={{viewTransitionName: "realisation-" + slug}}
            onMouseOver={(e) => {
                setHovered(true)
            }}
            onMouseOut={(e) => {
                setHovered(false)
            }}
        >
            {
                view == "full" && <ProjectFull {...props}/>
            }
            {
                view == "mini" && <ProjectMini {...props} isHovered={isHovered}/>
            }
        </Card>
    );
}


export const ProjectMini = ({slug, images, title, summary, isHovered}: Props & { isHovered: boolean }) => {
    return (
        <>
            <div className="w-full flex-1 rounded-2xl overflow-hidden relative bg-surface">
                <img loading="lazy" className={classNames(
                    "w-full h-full aspect-video group-hover:scale-[1.1] object-cover duration-700 transition-all ",
                    {
                        "scale-[1.1] opacity-70": isHovered
                    }
                )}
                     src={images.background.src}
                     height="1920"
                     width="1080" alt={"Illustration d'un projet"}/>

            </div>
            <div
                className={classNames("p-4 gap-4 lg:absolute backdrop-blur bottom-0  transition-all duration-300 w-full",
                    ' bg-surface/70',
                    " group-hover:bg-surface/80"
                )}>
                <div className="flex-1">
                    <p className="text-title-large">{title}</p>
                    <p style={{viewTransitionName: "realisation-summary-" + slug}}
                       className="text-title-small mt-2 transition-all  duration-300">{summary}</p>
                </div>
                <AnimatePresence>
                    {
                        isHovered && <motion.div
                            initial={{
                                opacity: 0,
                                height: 0,
                                marginTop: 0
                            }} // Démarre avec une marge supérieure négative et est invisible
                            animate={{
                                opacity: 1,
                                height: "auto",
                                marginTop: 6 * 4
                            }} // Devient visible avec une légère marge supérieure
                            exit={{opacity: 0, height: 0, marginTop: 0}} // Disparaît avec une marge supprimée

                            transition={{duration: 0.3}}       // Durée de l'animation
                        >
                            <Button iconPosition="right" icon={faArrowRight} label="Découvrir"
                                    className={classNames(
                                        "transition-all duration-300 hover:gap-4",
                                    )}
                            />
                        </motion.div>
                    }
                </AnimatePresence>
            </div>
        </>
    );
};

export const ProjectFull = ({
                                slug,
                                images,
                                title,
                                summary,
                                services,
                                technologies,
                                body,
                                sidebar,
                                website,
                            }: Props) => {
    return (
        <>
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
                        <p className={"text-display-medium text-center max-w-screen-md mx-auto transition-all  duration-300"}>{title}</p>
                    }
                </div>
                <p style={{viewTransitionName: "realisation-summary-" + slug}}
                   className={"text-display-small text-center max-w-screen-md mx-auto"}>{summary}</p>
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
        </>
    );
};

