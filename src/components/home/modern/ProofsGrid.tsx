import { motion } from "motion/react";

const proofs = [
    {
        title: "Indicateurs techniques mesurés",
        description: "Performance, SEO et accessibilité sont suivis et partagés pour piloter dans la durée.",
        badge: "Mesure"
    },
    {
        title: "Sobriété & éco-conception",
        description: "Choix techniques raisonnés, code léger et poids maîtrisé pour un site efficace.",
        badge: "Durabilité"
    },
    {
        title: "Clés & documentation",
        description: "Code source, accès et documentation remis. Formation incluse pour l'autonomie.",
        badge: "Autonomie"
    },
    {
        title: "Réalisations internes",
        description: "Udixio UI, templates métiers et CMS maison illustrent notre méthode et notre rigueur.",
        badge: "Réalisations"
    }
];

export const ProofsGrid = () => {
    return (
        <div className="mt-12 grid gap-px bg-outline-variant/30 border border-outline-variant/30 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 overflow-hidden rounded-3xl">
            {proofs.map((proof, index) => (
                <motion.div
                    key={index}
                    className="flex flex-col p-8 bg-surface hover:bg-surface-container-high transition-colors h-full"
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
