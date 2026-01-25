import { motion } from "motion/react";

const steps = [
    {
        number: "01",
        title: "Découverte & Audit",
        description: "On analyse votre existant et vos besoins. On pose le diagnostic sans concession."
    },
    {
        number: "02",
        title: "Stratégie & Cadrage",
        description: "On définit l'arborescence, les fonctionnalités et le planning. Vous validez le plan d'action."
    },
    {
        number: "03",
        title: "Design & Conception",
        description: "Maquettage UX/UI. On itère jusqu'à ce que l'expérience utilisateur soit fluide et alignée avec votre image."
    },
    {
        number: "04",
        title: "Développement & Tests",
        description: "Intégration propre, optimisations SEO et tests de performance. On ne livre rien qui ne soit pas robuste."
    },
    {
        number: "05",
        title: "Livraison & Hypercare",
        description: "Mise en ligne sécurisée, formation à l'administration, et support prioritaire post-lancement."
    }
];

export const MethodSteps = () => {
    return (
        <div className="mt-16 space-y-4">
            {steps.map((step, index) => (
                <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="group flex flex-col md:flex-row items-start md:items-center gap-6 p-6 rounded-2xl bg-surface hover:bg-surface-container-low border border-transparent hover:border-outline-variant/50 transition-all"
                >
                    <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-surface-container-high text-title-medium font-bold text-primary group-hover:scale-110 transition-transform">
                        {step.number}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-title-large font-bold mb-1">{step.title}</h3>
                        <p className="text-body-large text-on-surface-variant max-w-3xl">
                            {step.description}
                        </p>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};
