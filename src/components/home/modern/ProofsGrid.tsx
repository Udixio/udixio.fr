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
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {proofs.map((proof, index) => (
                <motion.div
                    key={index}
                    whileHover={{ y: -5 }}
                    className="flex flex-col p-6 rounded-3xl bg-surface-container-low border border-outline-variant/30 h-full"
                >
                    <div className="mb-4 self-start px-3 py-1 rounded-full bg-primary/10 text-primary text-label-small font-medium">
                        {proof.badge}
                    </div>
                    <h3 className="text-title-large font-bold mb-3">{proof.title}</h3>
                    <p className="text-body-medium text-on-surface-variant">
                        {proof.description}
                    </p>
                </motion.div>
            ))}
        </div>
    );
};
