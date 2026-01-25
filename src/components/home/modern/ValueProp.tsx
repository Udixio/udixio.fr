import { motion } from "motion/react";

const values = [
    {
        title: "1. Cadrage Stratégique",
        description: "On définit ensemble les objectifs business et les contraintes techniques. Un plan de route clair pour éviter les surprises.",
    },
    {
        title: "2. Transparence Totale",
        description: "Planning, budget, choix techniques : tout est expliqué et validé avec vous. Pas de jargon pour masquer le vide.",
    },
    {
        title: "3. Expertise Durable",
        description: "Codes propres, performance (GreenIT), et accessibilité. Des sites robustes faits pour durer des années.",
    },
    {
        title: "4. Indépendance Client",
        description: "Formation incluse, accès complets. Vous êtes maître à bord, nous sommes le pilote qui vous guide.",
    }
];

export const ValueProp = () => {
    return (
        <div className="mt-12 grid gap-6 md:grid-cols-2">
            {values.map((val, index) => (
                <motion.div
                    key={index}
                    initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="flex flex-col p-8 rounded-3xl bg-surface-container-low border border-outline-variant/30 hover:bg-surface-container transition-colors"
                >
                    <h3 className="text-title-large font-bold mb-3 text-primary">{val.title}</h3>
                    <p className="text-body-large text-on-surface-variant">
                        {val.description}
                    </p>
                </motion.div>
            ))}
        </div>
    );
};
