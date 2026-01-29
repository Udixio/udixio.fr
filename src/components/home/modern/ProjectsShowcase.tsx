import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { Button, classNames } from "@udixio/ui-react";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import type { ProjectProps } from "../../project/Project";

export const ProjectsShowcase = ({ projects }: { projects: ProjectProps[] }) => {
    const listRef = useRef<HTMLDivElement>(null);

    return (
        <div className="w-full space-y-8">
            <div className="flex justify-between items-end px-4">
               <div>
                   {/* Optional Header content if needed, but usually passed in parent */}
               </div>
               {/* Controls or indicators could go here */}
            </div>

            <div 
                ref={listRef}
                className="flex overflow-x-auto gap-6 px-4 pb-12 snap-x snap-mandatory hide-scrollbar"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {projects.map((project, index) => (
                    <ShowcaseItem key={project.slug} project={project} index={index} />
                ))}
                
                {/* CTA Card at the end */}
                <div className="min-w-[85vw] md:min-w-[30vw] snap-center flex flex-col justify-center items-center p-8 rounded-[2rem] bg-surface-container hover:bg-surface-container-high transition-colors border border-outline-variant/30 group">
                     <p className="text-headline-small text-on-surface text-center mb-6">
                         Et si le prochain projet, c'était le vôtre ?
                     </p>
                     <Button 
                        href="/contact" 
                        label="Lancer mon projet" 
                        icon={faArrowRight} 
                        iconPosition="right"
                        className="group-hover:pl-6 transition-all"
                     />
                </div>
            </div>
        </div>
    );
};

const ShowcaseItem = ({ project, index }: { project: ProjectProps, index: number }) => {
    return (
        <motion.a
            href={`/realisations/${project.slug}`}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            className="group relative min-w-[85vw] md:min-w-[45vw] lg:min-w-[40vw] aspect-[4/3] md:aspect-[16/10] rounded-[2rem] overflow-hidden snap-center cursor-pointer block"
        >
            {/* Background Image */}
            <div className="absolute inset-0 bg-surface-container-low animate-pulse" /> {/* Placeholder */}
            <img 
                src={project.images.background.src} 
                alt={project.title}
                style={{ viewTransitionName: `realisation-${project.slug}` }}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            
            {/* Gradient Overlay */}
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            
            {/* Content */}
            <div className="absolute bottom-0 left-0 p-8 w-full">
                <div className="flex justify-between items-end">
                    <div className="flex-1">
                        <h3 className="text-headline-small md:text-headline-medium text-white mb-2">
                            {project.title}
                        </h3>
                        <p className="text-body-medium text-white/80 line-clamp-2 max-w-md group-hover:text-white transition-colors">
                            {project.summary}
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 group-hover:bg-white group-hover:text-primary-fixed transition-colors duration-300">
                         <span className="sr-only">Voir le projet</span>
                         <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transform -rotate-45 group-hover:rotate-0 transition-transform duration-300">
                             <line x1="5" y1="12" x2="19" y2="12"></line>
                             <polyline points="12 5 19 12 12 19"></polyline>
                         </svg>
                    </div>
                </div>
            </div>
        </motion.a>
    );
};
