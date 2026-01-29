import { motion } from "motion/react";

const schemaItems = [
    {
        id: "cadrage",
        title: "Objectifs clairs, décisions posées",
        desc: "Atelier initial, priorités cadrées, périmètre validé avant d'avancer.",
    },
    {
        id: "transparence",
        title: "Suivi lisible, échanges simples",
        desc: "Avancement partagé, décisions expliquées, budget et planning sans zones d'ombre.",
    },
    {
        id: "expertise",
        title: "Qualité durable, sobriété mesurée",
        desc: "Technos ouvertes, performance suivie, accessibilité soignée, éco‑indicateurs maîtrisés.",
    },
    {
        id: "independance",
        title: "Autonomie réelle, sans dépendance",
        desc: "Code livré, documentation claire, formation incluse pour garder la main.",
    }
];

export const ProblemSolutionSchema = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16 max-w-5xl mx-auto">
            {schemaItems.map((item, index) => (
                <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="group relative p-8 rounded-3xl bg-on-inverse-surface/5 border border-on-inverse-surface/10 hover:border-primary-fixed/50 hover:bg-on-inverse-surface/10 transition-all duration-500"
                >
                    <h3 className="text-headline-medium text-inverse-on-surface mb-3 group-hover:text-primary-fixed transition-colors">
                        {item.title}
                    </h3>
                    <p className="text-body-large text-inverse-on-surface/80">
                        {item.desc}
                    </p>
                </motion.div>
            ))}
        </div>
    );
};
