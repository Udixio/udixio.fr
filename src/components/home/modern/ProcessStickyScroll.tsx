"use client";
import { motion } from "motion/react";
import { classNames } from "@udixio/ui-react";

// Content for the 5-step process
const content = [
  {
    title: "1. Exploration & Diagnostic",
    description:
      "On ne vend pas un template, on résout un problème. Nous commençons par un audit de vos enjeux business pour viser juste.",
  },
  {
    title: "2. Cadrage & Plan d'action",
    description:
      "Feuille de route claire. Périmètre, budget, et délais sont figés et validés ensemble. Vous savez exactement où on va.",
  },
  {
    title: "3. Design & Prototype",
    description:
      "Co-conception. Vous validez l'ergonomie et le style sur des maquettes interactives. Zéro surprise visuelle à l'arrivée.",
  },
  {
    title: "4. Dév. Transparent",
    description:
      "Vous suivez l'avancée (accès staging). Nous construisons votre outil avec des technos modernes et durables (Astro, React).",
  },
    {
        title: "5. Livraison & Autonomie",
        description:
            "Clés en main. Formation complète, code source livré. Vous êtes maître à bord (et on reste dispo pour le support).",
    },
];

export const ProcessStickyScroll = () => {
  return (
    <div className="mt-12 flex flex-col gap-8 md:gap-0 max-w-4xl mx-auto">
      {content.map((item, index) => (
        <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: index * 0.1 }}
            className="flex flex-col md:flex-row gap-6 md:gap-12 relative"
        >
            {/* Timeline Line (Desktop) */}
            {index < content.length - 1 && (
                <div className="hidden md:block absolute left-[2.5rem] top-16 bottom-[-2rem] w-px bg-outline-variant/30" />
            )}

            {/* Number Bubble */}
            <div className="flex-shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-surface-container-high border border-outline-variant/50 flex items-center justify-center text-title-large font-bold text-primary shadow-sm">
                    {index + 1}
                </div>
            </div>

            {/* Content */}
            <div className="pb-8 pt-2">
                <h3 className="text-title-large font-bold text-on-surface mb-3">
                    {item.title.split(". ")[1]}
                </h3>
                <p className="text-body-large text-on-surface-variant leading-relaxed">
                    {item.description}
                </p>
            </div>
        </motion.div>
      ))}
    </div>
  );
};
