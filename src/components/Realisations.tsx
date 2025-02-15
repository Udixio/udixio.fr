import {Button, Card, Carousel, CarouselItem} from "@udixio/ui";
import {type Key, useEffect, useRef, useState} from "react";
import {useInView} from "framer-motion";
import {BackgroundColor} from "@components/BackgroundColor.tsx";
import {UpdateTheme} from "@components/UpdateTheme";


const Realisations = ({realisations}: any) => {


    const carouselRef = useRef<HTMLDivElement>(null);
    const isInView = useInView(carouselRef, {amount: .5});


    const [selectedProject, setSelectedProject] = useState<{
        id: number,
        dody: string,
        collection: string,
        data: {
            title: string,
            description: string,
            theme: {
                isDark: boolean,
                source: string,
            },
            image: {
                src: string,
                alt: string,
            },
        }
        body: string
    }>(realisations[0]);

    const handleScroll = (index: number) => {
        setSelectedProject(realisations[index])
    };
    const [theme, setTheme] = useState<{ isDark: boolean, source: string } | null>(null)
    useEffect(() => {
        if (isInView) {
            setTheme({isDark: true, source: selectedProject.data.theme.source})
        } else {
            setTheme(null)
        }

    }, [selectedProject, isInView]);

    return <section id="projets" className=" tab-menu  pt-16 flex items-center relative">
        <UpdateTheme theme={theme}/>
        <BackgroundColor canEscape={false} count={5} radius={800} className="opacity-100 z-10"/>
        <div className="max-w-screen-2xl w-full padding-x mx-auto z-20">

            <Carousel className="h-[auto] max-h-[600px] aspect-[16/9] " ref={carouselRef} onChange={handleScroll}
                      outputRange={[40, 1000]}
            >
                {realisations.map((project: any, index: Key | null | undefined) => (
                    <CarouselItem className={'!max-w-full'} key={index}>
                        <a href={"/nos-realisations/" + project.id}>
                            <Card isInteractive className="h-full !rounded-[28px]"
                                  style={{viewTransitionName: "realisation-" + project.id}}>
                                <img className={'object-cover  h-full w-full'} src={project.data.image.src}/>
                            </Card>
                        </a>
                    </CarouselItem>
                ))}
            </Carousel>
            <Button href={"/nos-realisations"} className="mx-auto mt-4 w-fit" variant="text"
                    label="Voir tous les projets"/>
        </div>

    </section>
}


export default Realisations