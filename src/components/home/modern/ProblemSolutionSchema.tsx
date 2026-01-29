import { motion } from "motion/react";

const schemaItems = [
    {
        id: "cadrage",
        problem: "Objectifs flous",
        solution: "Cadrage & Clarté",
        desc: "Atelier initial, périmètre validé, plan d'action partagé.",
    },
    {
        id: "transparence",
        problem: "Manque de visibilité",
        solution: "Transparence & Pédagogie",
        desc: "Suivi en temps réel, décisions expliquées, budget lisible.",
    },
    {
        id: "expertise",
        problem: "Site fragile",
        solution: "Expertise & Fiabilité",
        desc: "Technos ouvertes, performance mesurée, accessibilité soignée.",
    },
    {
        id: "independance",
        problem: "Dépendance",
        solution: "Autonomie",
        desc: "Code livré, documentation claire, formation incluse.",
    }
];

export const ProblemSolutionSchema = () => {
    return (
        <div className="flex flex-col gap-4 mt-16 max-w-5xl mx-auto">
            {schemaItems.map((item, index) => (
                <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="group relative grid grid-cols-1 md:grid-cols-[1fr_auto_1.5fr] items-center gap-6 md:gap-12 p-8 rounded-3xl bg-white/5 border border-white/5 hover:border-primary/50 hover:bg-white/10 transition-all duration-500"
                >
                     {/* PROBLEM (Left) */}
                     <div className="text-center md:text-right">
                        <span className="text-label-small font-mono text-tertiary-fixed uppercase tracking-widest mb-2 block opacity-70">Le risque</span>
                        <h3 className="text-headline-medium text-white/30 line-through decoration-white/10 decoration-2 font-serif italic">
                            {item.problem}
                        </h3>
                     </div>

                     {/* ARROW (Center) */}
                     <div className="flex justify-center md:block text-white/20 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300">
                        <svg className="w-8 h-8 rotate-90 md:rotate-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                        </svg>
                     </div>

                     {/* SOLUTION (Right) */}
                     <div className="text-center md:text-left">
                        <span className="text-label-small font-mono text-primary-fixed uppercase tracking-widest mb-2 block opacity-70">Avec Udixio</span>
                        <h3 className="text-headline-medium font-bold text-white mb-2 group-hover:text-primary-fixed transition-colors">{item.solution}</h3>
                        <p className="text-body-large text-white/70 max-w-md">
                            {item.desc}
                        </p>
                     </div>
                </motion.div>
            ))}
        </div>
    );
};
