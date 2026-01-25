import { motion } from "motion/react";

const schemaItems = [
    {
        id: "cadrage",
        problem: "Flou & Dérives",
        solution: "Cadrage Stratégique",
        desc: "Objectifs clairs, périmètre blindé, planning fixe.",
    },
    {
        id: "transparence",
        problem: "Opacité",
        solution: "Transparence",
        desc: "Aucun coût caché, vous validez chaque étape.",
    },
    {
        id: "expertise",
        problem: "Bricolage",
        solution: "Expertise Durable",
        desc: "Code propre, performance GreenIT, accessibilité.",
    },
    {
        id: "independance",
        problem: "Dépendance",
        solution: "Indépendance",
        desc: "Vous êtes propriétaire à 100%, formation incluse.",
    }
];

export const ProblemSolutionSchema = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            {schemaItems.map((item, index) => (
                <div key={item.id} className="relative group">
                     {/* Connector Line (Desktop) */}
                     {index < schemaItems.length - 1 && (
                         <div className="absolute top-1/2 -right-3 w-6 h-px bg-outline-variant/50 hidden lg:block z-0" />
                     )}

                    <motion.div
                        className="h-full flex flex-col rounded-3xl bg-surface-container overflow-hidden border border-outline-variant/50"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 }}
                    >
                        {/* PROBLEM SECTION */}
                        <div className="p-6 bg-surface-container-high border-b border-outline-variant/30 relative overflow-hidden">
                             <div className="absolute top-2 right-2 opacity-10">
                                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12">
                                     <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clipRule="evenodd" />
                                 </svg>
                             </div>
                             <p className="text-label-large text-error font-bold mb-1 uppercase tracking-wider">Avant</p>
                             <h3 className="text-title-large text-on-surface-variant line-through decoration-error/50 decoration-2">{item.problem}</h3>
                        </div>

                        {/* ARROW */}
                        <div className="relative h-0 flex justify-center items-center z-10">
                            <div className="bg-surface rounded-full p-1 border border-outline-variant text-primary shadow-sm translate-y-[-50%]">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
                                </svg>
                            </div>
                        </div>

                        {/* SOLUTION SECTION */}
                        <div className="p-6 flex-grow bg-primary text-on-primary flex flex-col justify-center text-center">
                            <p className="text-label-large text-on-primary/80 font-bold mb-1 uppercase tracking-wider">Avec Udixio</p>
                            <h3 className="text-xl font-bold mb-3">{item.solution}</h3>
                            <p className="text-body-medium opacity-90 leading-snug">{item.desc}</p>
                        </div>
                    </motion.div>
                </div>
            ))}
        </div>
    );
};
