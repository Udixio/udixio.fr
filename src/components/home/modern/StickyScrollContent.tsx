import React from "react";
import type { StickyScrollItem } from "@/components/sticky-scroll-reveal";
import { motion } from "motion/react";
import { Icon } from "@udixio/ui-react";

import { iChecklist } from "@udixio/icons-rounded-400/checklist";
import { iVerifiedUser } from "@udixio/icons-rounded-400/verified_user";
import { iKey } from "@udixio/icons-rounded-400/key";
import { iStorefront } from "@udixio/icons-rounded-400/storefront";
import { iGroups } from "@udixio/icons-rounded-400/groups";
import { iRocketLaunch } from "@udixio/icons-rounded-400/rocket_launch";

// Animation 1 : Budget & ROI (Storefront -> Groups)
const AnimationBudget = () => (
  <div className="w-full h-full bg-primary-container/10 border border-outline-variant/30 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden">
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ repeat: Infinity, duration: 4, repeatType: "reverse" }}
      className="flex flex-col items-center gap-4 z-10"
    >
      <div className="flex items-center gap-4 bg-surface p-4 rounded-xl shadow-lg border border-outline-variant/10">
        <div className="bg-secondary/10 p-2 rounded-lg text-secondary">
          <Icon icon={iStorefront} className="w-8 h-8 fill-current" />
        </div>
        <span className="text-title-medium font-bold">Investissement</span>
      </div>
      
      {/* Ligne pointillée animée */}
      <div className="flex flex-col items-center gap-1 my-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0.2 }}
            animate={{ opacity: 1 }}
            transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.3, repeatType: "reverse" }}
            className="w-2 h-2 rounded-full bg-primary"
          />
        ))}
      </div>

      <div className="flex items-center gap-4 bg-primary text-on-primary p-4 rounded-xl shadow-xl">
        <div className="bg-white/20 p-2 rounded-lg">
          <Icon icon={iGroups} className="w-8 h-8 fill-current" />
        </div>
        <span className="text-title-medium font-bold">Nouveaux clients</span>
      </div>
    </motion.div>
    
    {/* Fond abstrait */}
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
      className="absolute w-[150%] h-[150%] opacity-5 bg-[conic-gradient(from_0deg_at_50%_50%,var(--color-primary),transparent_60%)]"
    />
  </div>
);

// Animation 2 : Suivi & Accompagnement
const AnimationSuivi = () => (
  <div className="w-full h-full bg-tertiary-container/10 border border-outline-variant/30 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden gap-6">
    {["Cadrage & devis", "Validation design", "Mise en ligne"].map((text, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0.3, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ repeat: Infinity, duration: 3, delay: i * 0.8, repeatType: "reverse" }}
        className="flex items-center justify-between bg-surface p-4 w-4/5 rounded-xl shadow-md border border-outline-variant/10 z-10"
      >
        <span className="text-label-large text-on-surface font-semibold">{text}</span>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ repeat: Infinity, duration: 3, delay: i * 0.8 + 0.4, repeatType: "reverse" }}
        >
          <Icon icon={iChecklist} className="w-6 h-6 text-tertiary fill-current" />
        </motion.div>
      </motion.div>
    ))}
  </div>
);

// Animation 3 : Performance & Croissance
const AnimationPerformance = () => (
  <div className="w-full h-full bg-secondary-container/10 border border-outline-variant/30 rounded-2xl flex items-center justify-center relative overflow-hidden">
    <div className="relative flex items-center justify-center">
      {/* Cercles concentriques */}
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ scale: 0.8, opacity: 0.5 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ repeat: Infinity, duration: 2, delay: i * 0.6 }}
          className="absolute rounded-full border border-secondary"
          style={{ width: `${i * 100}px`, height: `${i * 100}px` }}
        />
      ))}
      <motion.div
        animate={{ y: [-10, 10, -10] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        className="bg-surface p-8 rounded-full shadow-xl border border-outline-variant/20 flex flex-col items-center gap-2 z-10"
      >
        <div className="bg-secondary/10 p-4 rounded-full text-secondary">
          <Icon icon={iRocketLaunch} className="w-12 h-12 fill-current" />
        </div>
      </motion.div>
    </div>
  </div>
);

// Animation 4 : Propriété totale
const AnimationPropriete = () => (
  <div className="w-full h-full bg-primary-container/10 border border-outline-variant/30 rounded-2xl flex items-center justify-center relative overflow-hidden gap-8">
    <div className="relative flex items-center justify-center">
      <motion.div
        animate={{ rotate: [0, 10, -10, 0] }}
        transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
        className="bg-surface p-8 rounded-full shadow-2xl relative z-10 border border-outline-variant/10"
      >
        <Icon icon={iKey} className="w-16 h-16 text-primary fill-current" />
      </motion.div>
      
      {/* Badges flottants */}
      <motion.div
        animate={{ y: [-5, 5, -5] }}
        transition={{ repeat: Infinity, duration: 3 }}
        className="absolute -top-12 -right-8 bg-surface shadow-lg rounded-lg p-3 flex gap-2 items-center border border-outline-variant/10"
      >
        <Icon icon={iVerifiedUser} className="w-5 h-5 text-green-500 fill-current" />
        <span className="text-label-medium font-bold">100% à vous</span>
      </motion.div>
    </div>
  </div>
);

export const stickyScrollItemsAstro: StickyScrollItem[] = [
  {
    title: "Un budget clair, un site qui rapporte",
    description: "Fini les mauvaises surprises. Nous fixons le prix ensemble avant de démarrer. Notre but est simple : faire de votre site un vrai levier pour développer votre chiffre d'affaires.",
    content: (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        <div className="flex gap-3 items-start bg-surface-container-low p-4 rounded-xl border border-outline-variant/30">
          <div className="bg-primary/10 rounded-full p-2 shrink-0">
            <Icon icon={iChecklist} className="w-5 h-5 text-primary fill-current" />
          </div>
          <span className="text-body-medium font-medium pt-1">Devis fixe dès le départ</span>
        </div>
        <div className="flex gap-3 items-start bg-surface-container-low p-4 rounded-xl border border-outline-variant/30">
          <div className="bg-primary/10 rounded-full p-2 shrink-0">
            <Icon icon={iStorefront} className="w-5 h-5 text-primary fill-current" />
          </div>
          <span className="text-body-medium font-medium pt-1">Pensé pour votre rentabilité</span>
        </div>
      </div>
    ),
    media: <AnimationBudget />,
    themeColorHex: "#10B981" // Vert (Argent/Rentabilité)
  },
  {
    title: "Un suivi de A à Z, sans jargon",
    description: "Concentrez-vous sur votre métier, on s'occupe de la technique. Nous vous expliquons chaque étape simplement, et nous gérons tout le transfert si vous avez déjà un site.",
    content: (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        <div className="flex gap-3 items-start bg-surface-container-low p-4 rounded-xl border border-outline-variant/30">
          <div className="bg-tertiary/10 rounded-full p-2 shrink-0">
            <Icon icon={iGroups} className="w-5 h-5 text-tertiary fill-current" />
          </div>
          <span className="text-body-medium font-medium pt-1">Échange direct avec nous</span>
        </div>
        <div className="flex gap-3 items-start bg-surface-container-low p-4 rounded-xl border border-outline-variant/30">
          <div className="bg-tertiary/10 rounded-full p-2 shrink-0">
            <Icon icon={iVerifiedUser} className="w-5 h-5 text-tertiary fill-current" />
          </div>
          <span className="text-body-medium font-medium pt-1">Accompagnement continu</span>
        </div>
      </div>
    ),
    media: <AnimationSuivi />,
    themeColorHex: "#F59E0B" // Orange / Ambre (Interaction/Convivialité)
  },
  {
    title: "Fait pour être vu sur Google",
    description: "Un beau site ne sert à rien s'il n'est pas visible. Nous construisons des plateformes ultra-rapides qui séduisent autant vos futurs clients que les moteurs de recherche.",
    content: (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        <div className="flex gap-3 items-start bg-surface-container-low p-4 rounded-xl border border-outline-variant/30">
          <div className="bg-secondary/10 rounded-full p-2 shrink-0">
            <Icon icon={iRocketLaunch} className="w-5 h-5 text-secondary fill-current" />
          </div>
          <span className="text-body-medium font-medium pt-1">Vitesse de chargement optimale</span>
        </div>
        <div className="flex gap-3 items-start bg-surface-container-low p-4 rounded-xl border border-outline-variant/30">
          <div className="bg-secondary/10 rounded-full p-2 shrink-0">
            <Icon icon={iChecklist} className="w-5 h-5 text-secondary fill-current" />
          </div>
          <span className="text-body-medium font-medium pt-1">Référencement local (SEO)</span>
        </div>
      </div>
    ),
    media: <AnimationPerformance />,
    themeColorHex: "#3B82F6" // Bleu (Tech/Rapidité)
  },
  {
    title: "Vous êtes 100% propriétaire",
    description: "Pas d'abonnement toxique ni de données bloquées. Une fois le projet livré, vous possédez intégralement votre site, vos accès et chaque ligne de code.",
    content: (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        <div className="flex gap-3 items-start bg-surface-container-low p-4 rounded-xl border border-outline-variant/30">
          <div className="bg-primary/10 rounded-full p-2 shrink-0">
            <Icon icon={iKey} className="w-5 h-5 text-primary fill-current" />
          </div>
          <span className="text-body-medium font-medium pt-1">Accès complet à l'hébergement</span>
        </div>
        <div className="flex gap-3 items-start bg-surface-container-low p-4 rounded-xl border border-outline-variant/30">
          <div className="bg-primary/10 rounded-full p-2 shrink-0">
            <Icon icon={iVerifiedUser} className="w-5 h-5 text-primary fill-current" />
          </div>
          <span className="text-body-medium font-medium pt-1">Sans engagement bloquant</span>
        </div>
      </div>
    ),
    media: <AnimationPropriete />,
    themeColorHex: "#A855F7" // Violet (Propriété/Premium)
  },
];
