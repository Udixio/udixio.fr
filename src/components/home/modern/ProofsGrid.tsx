import { motion } from "motion/react";

const proofs = [
    {
        title: "Scores de Performance 100/100",
        description: "Nous visons l'excellence mesurable (Lighthouse) sur la vitesse et le SEO, prouvée sur nos réalisations.",
        badge: "Qualité mesurée"
    },
    {
        title: "Indépendance Technique Totale",
        description: "Nous utilisons des outils ouverts et performants (Astro, React, CMS sur-mesure) pour vous libérer des systèmes fermés.",
        badge: "Propriété Client"
    },
    {
        title: "Outils Développés en Interne",
        description: "Notre CMS léger Netsimpler et notre propre librairie design Udixio UI garantissent efficacité et personnalisation.",
        badge: "Créateurs"
    },
    {
        title: "Méthodologie Cadrée et Publique",
        description: "Notre processus (ateliers, points de validation, garanties post-lancement) est documenté pour avancer en toute confiance.",
        badge: "Méthodologie"
    }
];

export const ProofsGrid = () => {
    return (
        <div className="mt-12 grid gap-px bg-outline-variant/30 border border-outline-variant/30 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 overflow-hidden rounded-3xl">
            {proofs.map((proof, index) => (
                <motion.div
                    key={index}
                    className="flex flex-col p-8 bg-surface h-full"
                >
                    <div className="mb-6 self-start px-3 py-1 rounded-full border border-primary/20 text-primary text-label-small font-mono uppercase tracking-wider">
                        {proof.badge}
                    </div>
                    <div className="mt-auto">
                        <h3 className="text-title-large font-bold mb-3 leading-tight">{proof.title}</h3>
                        <p className="text-body-medium text-on-surface-variant/80">
                            {proof.description}
                        </p>
                    </div>
                </motion.div>
            ))}
        </div>
    );

};
