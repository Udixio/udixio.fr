import { motion } from "motion/react";

const schemaItems = [
    {
        id: "cadrage",
        title: "Budget flou ? Cadrage net.",
        desc: "Pas de dérives financières. Un atelier initial pose vos priorités, le périmètre et le devis exact avant tout développement.",
    },
    {
        id: "transparence",
        title: "« Boîte noire » ? Suivi limpide.",
        desc: "Fini le jargon et les dépendances aveugles. Vous suivez chaque étape, validez chaque jalon et comprenez ce qu'on fait.",
    },
    {
        id: "expertise",
        title: "Site lent ou invisible ? Qualité 100/100.",
        desc: "On ne sacrifie ni la performance (100 Lighthouse), ni le SEO. Nos choix techniques garantissent des résultats pérennes.",
    },
    {
        id: "independance",
        title: "Prestataire bloquant ? Propriété totale.",
        desc: "Pas de coûts cachés ou d'abonnement forcé. Code source, accès serveurs : on vous donne les clés et on vous forme.",
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
