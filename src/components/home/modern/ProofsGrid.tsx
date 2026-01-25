import { motion } from "motion/react";

const proofs = [
    {
        title: "Responsabilité Totale",
        description: "Un duo fondateur engagé. Pas de junior caché en stage sur votre projet critique - vous parlez à des seniors.",
        badge: "Garantie"
    },
    {
        title: "Udixio UI System",
        description: "Notre librairie de composants interne, testée et optimisée. Garantit cohérence visuelle et développement accéléré.",
        badge: "Asset"
    },
    {
        title: "NetSimpler CMS",
        description: "L'administration sans douleur. Notre interface simplifie votre gestion de contenu sans vous enfermer dans du code propriétaire.",
        badge: "Product"
    },
    {
        title: "Performance 100/100",
        description: "Scores Lighthouse vérifiables. Un site ultra-rapide convertit mieux et plaît aux algorithmes de Google.",
        badge: "Metric"
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
