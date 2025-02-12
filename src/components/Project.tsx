import {Carousel, CarouselItem} from "@udixio/ui";
import {type Key, useEffect, useRef, useState} from "react";
import {bootstrapFromConfig, VariantModel} from "@udixio/theme";
import {DislikeAnalyzer, sanitizeDegreesDouble, TonalPalette} from "@material/material-color-utilities";
import {useInView} from "framer-motion";
import {BackgroundColor} from "@components/BackgroundColor.tsx";


const Project = ({projects}: any) => {
    const [{colorService, themeService}] = useState(
        bootstrapFromConfig({
            config: {
                sourceColor: '#ee1838',
                variant: {
                    ...VariantModel.tonalSpot,
                    palettes: {
                        ...VariantModel.tonalSpot.palettes,
                        secondary: (sourceColorHct) =>
                            TonalPalette.fromHueAndChroma(sourceColorHct.hue, 24.0),
                        tertiary: (sourceColorHct) =>
                            TonalPalette.fromHueAndChroma(
                                sanitizeDegreesDouble(sourceColorHct.hue + 45.0),
                                24.0
                            ),
                    }
                },
                colors: {
                    colors: {
                        tertiaryContainer: {
                            tone: (s) => {
                                const proposedHct = s
                                    .getPalette('tertiary')
                                    .getHct((s.isDark ? 30 : 93),);
                                return DislikeAnalyzer.fixIfDisliked(proposedHct).tone;
                            },
                        },
                    },
                },
            },
        }),
    );


    const updateTheme = (isDark: boolean, source: string) => {
        themeService.update({isDark: isDark});
        themeService.update({sourceColorHex: source});
        for (const [key, value] of colorService.getColors().entries()) {
            const newKey = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
            const {r, g, b} = value.getRgb()
            document.documentElement.style.setProperty('--colors-' + newKey, `${r} ${g} ${b}`);
        }
    }
    const resetTheme = (isDark: boolean) => {
        for (const [key] of colorService.getColors().entries()) {
            const newKey = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
            document.documentElement.style.removeProperty('--colors-' + newKey);
        }
    }


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
    }>(projects[0]);

    const handleScroll = (index: number) => {
        setSelectedProject(projects[index])
    };
    useEffect(() => {
        if (isInView) {
            updateTheme(selectedProject.data.theme.isDark, selectedProject.data.theme.source)
        } else {
            resetTheme(selectedProject.data.theme.isDark)
        }

    }, [selectedProject, isInView]);

    return <section id="projets" className=" tab-menu  pt-16 flex items-center relative">
        <BackgroundColor canEscape={false} count={5} radius={800} className="opacity-100 z-10"/>
        <div className="max-w-screen-2xl w-full padding-x mx-auto z-20">

            <Carousel className="h-[auto] max-h-[600px] aspect-[16/9] " ref={carouselRef} onChange={handleScroll}
                      outputRange={[40, 1000]}
            >
                {projects.map((project: any, index: Key | null | undefined) => (
                    <CarouselItem className={'!max-w-full'} key={index}>

                        <img
                            className={'object-cover  h-full w-full'}
                            alt={'illustration'}
                            src={project.data.image.src}
                        />
                    </CarouselItem>
                ))}
            </Carousel>
        </div>

    </section>
}


export default Project