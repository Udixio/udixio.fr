import { Icon } from "@udixio/ui-react";

import { iInfo } from "@udixio/icons-rounded-400/info";
import { iVisibilityOff } from "@udixio/icons-rounded-400/visibility_off";
import { iChat } from "@udixio/icons-rounded-400/chat";
import { iLock } from "@udixio/icons-rounded-400/lock";

const features = [
  {
    title: "L'Engagement du Duo",
    description:
      "Vos objectifs deviennent les nôtres. Nous pilotons votre projet en direct, de bout en bout.",
    icon: iInfo,
  },
  {
    title: "Un Savoir-Faire Structuré",
    description:
      "On cadre, on explique, on valide. Chaque étape est lisible et sécurise vos décisions.",
    icon: iVisibilityOff,
  },
  {
    title: "Expertise & Fiabilité",
    description:
      "Deux experts, des solutions performantes (100/100) et durables pour votre activité.",
    icon: iChat,
  },
  {
    title: "Maîtrise & Flexibilité",
    description:
      "Livrables, accès et transparence : vous gardez les clés de votre site sans être captif.",
    icon: iLock,
  },
];

export const FeaturesGrid = () => {
  return (
    <div className="flex flex-col gap-4 mt-4">
      {features.map((feature, index) => (
        <div
          style={{ ["--anim-delay"]: `${100 * index}ms` }}
          key={index}
          className="group flex gap-4 items-start p-4 rounded-2xl border border-transparent  anim-in-fade
anim-slide-from-right
anim-duration-1000
anim-delay-200
 "
        >
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/5 text-primary flex items-center justify-center transition-colors duration-300">
            <Icon icon={feature.icon}></Icon>
          </div>
          <div>
            <h3 className="text-title-medium font-bold text-on-surface mb-1">
              {feature.title}
            </h3>
            <p className="text-body-medium text-on-surface-variant transition-colors">
              {feature.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
