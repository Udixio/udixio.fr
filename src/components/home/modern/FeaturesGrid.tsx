import { motion } from "motion/react";
import { classNames } from "@udixio/ui-react";

const features = [
    {
        title: "Le flou artistique",
        description: "Devis flous, délais élastiques... l'improvisation coûte cher à votre entreprise.",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
        )
    },
    {
        title: "L'opacité technique",
        description: "\"C'est compliqué\" est souvent une excuse. Exigez de comprendre ce que vous achetez.",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>
        )
    },
    {
        title: "L'agence « Boîte Noire »",
        description: "Interlocuteurs multiples, tickets anonymes... qui s'occupe vraiment de votre projet ?",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
            </svg>
        )
    },
    {
        title: "La prise d'otage",
        description: "Abonnements cachés, code propriétaire : vous finissez captif de votre prestataire.",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
        )
    }
];

const cardVariants = {
    offscreen: {
        y: 20,
        opacity: 0
    },
    onscreen: {
        y: 0,
        opacity: 1,
        transition: {
            type: "spring" as const, // Fix lint error by asserting literal type
            bounce: 0.4,
            duration: 0.8
        }
    }
};

export const FeaturesGrid = () => {
    return (
        <motion.div
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mt-12"
            initial="offscreen"
            whileInView="onscreen"
            viewport={{ once: true, amount: 0.2 }}
            transition={{ staggerChildren: 0.1 }}
        >
            {features.map((feature, index) => (
                <motion.div
                    key={index}
                    variants={cardVariants}
                    className="group relative overflow-hidden rounded-3xl bg-surface-container hover:bg-surface-container-high transition-colors p-8 border border-outline-variant/50 hover:border-outline-variant"
                >
                    <div className="mb-4 text-primary group-hover:scale-110 transition-transform duration-300">
                        {feature.icon}
                    </div>
                    <h3 className="text-title-large font-bold mb-3">{feature.title}</h3>
                    <p className="text-body-large text-on-surface-variant group-hover:text-on-surface transition-colors">
                        {feature.description}
                    </p>
                </motion.div>
            ))}
        </motion.div>
    );
};
