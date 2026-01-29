import {motion} from "motion/react";

export const Underline = ({className = "", delay = 0.1, duration = 0.5}: {
    className?: string,
    delay?: number,
    duration?: number
}) => {
    return (
        <svg
            className={`absolute -bottom-2 md:-bottom-4 left-0 w-full h-3 md:h-6 -z-10 ${className}`}
            viewBox="0 0 100 10"
            preserveAspectRatio="none"
        >
            <motion.path
                d="M0 5 Q 50 15 100 5"
                stroke="currentColor"
                strokeWidth="5"
                fill="none"
                initial={{pathLength: 0}}
                animate={{pathLength: 1}}
                transition={{
                    duration,
                    ease: "easeOut",
                    delay,
                }}
            />
        </svg>
    );
};
