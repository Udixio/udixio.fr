import {useEffect, useState} from "react";
import {Underline} from "@components/Underline";

export interface TypewriterPhrase {
    verb: string;
    prefix: string;
    highlight: string;
}

export interface TypewriterTextProps {
    phrases: TypewriterPhrase[];
}

export const TypewriterText = ({phrases}: TypewriterTextProps) => {
    const [index, setIndex] = useState(0);
    // Initialize fully typed out for the first phrase (index 0)
    const initialFullLength = phrases.length > 0 ? phrases[0].verb.length + phrases[0].prefix.length + phrases[0].highlight.length : 0;
    const [isInitialState, setIsInitialState] = useState(true);
    const [visible, setVisible] = useState(true);
    const [underlineReady, setUnderlineReady] = useState(initialFullLength > 0);

    const phrase = phrases[index];
    const fullLength = phrase.verb.length + phrase.prefix.length + phrase.highlight.length;

    // CSS fade parameters
    const letterDelay = 15; // 15ms per letter wavefront
    const fadeDuration = 700; // 700ms duration per letter

    const highlightEndDelay = fullLength * letterDelay;
    const totalFadeTime = highlightEndDelay + fadeDuration;

    // Gemini-like progressive fade effect using CSS transitions
    useEffect(() => {
        if (isInitialState) {
            const t = setTimeout(() => {
                setIsInitialState(false);
                setVisible(false);
                setUnderlineReady(false);

                setTimeout(() => {
                    setIndex((prev) => (prev + 1) % phrases.length);
                }, 50);

            }, 3000);
            return () => clearTimeout(t);
        }

        if (!visible) {
            const t = setTimeout(() => {
                setVisible(true);
            }, 50);
            return () => clearTimeout(t);
        }

        const tUnderline = setTimeout(() => {
            setUnderlineReady(true);
        }, highlightEndDelay + 400); // Trigger underline slightly before the fade reaches mathematically 100% opacity for better responsiveness

        const tNext = setTimeout(() => {
            setVisible(false);
            setUnderlineReady(false);
            setTimeout(() => {
                setIndex((prev) => (prev + 1) % phrases.length);
            }, 50);
        }, totalFadeTime + 2500); // Wait 2.5s before changing word

        return () => {
            clearTimeout(tUnderline);
            clearTimeout(tNext);
        };
    }, [isInitialState, visible, index, phrases.length, highlightEndDelay, totalFadeTime]);

    // Give each character a delay based on its absolute position in the entire sentence
    const renderChars = (text: string, globalOffset: number) => {
        return text.split("").map((char, i) => {
            const charAbsoluteIndex = globalOffset + i;
            const delayMs = (!isInitialState && visible) ? charAbsoluteIndex * letterDelay : 0;
            const durationClass = (!isInitialState && visible) ? "duration-700" : "duration-0";
            const opacityClass = visible ? "opacity-100" : "opacity-0";

            return (
                <span
                    key={i}
                    className={`inline-block transition-opacity ease-out ${durationClass} ${opacityClass}`}
                    style={{transitionDelay: `${delayMs}ms`}}
                >
                    {char === " " ? "\u00A0" : char}
                </span>
            );
        });
    };

    return (
        <>
            {/* Row 2: Progressive Indent (Staircase) */}
            <span
                className="self-center flex h-16 md:h-24 text-display-large text-outline mt-2 md:-mt-6 relative whitespace-nowrap"
            >
                <span className="opacity-0">{phrase.verb}</span>
                <span className="absolute left-0 top-0 whitespace-nowrap">
                    {renderChars(phrase.verb, 0)}
                </span>
            </span>

            {/* Row 3: Further Indent */}
            <span
                className="self-end flex flex-col md:flex-row items-baseline gap-2 md:gap-6 mt-2 md:-mt-6 min-h-20 md:min-h-32">
                <span
                    className="relative text-headline-medium lowercase text-on-surface whitespace-nowrap min-h-8">
                    <span className="opacity-0">{phrase.prefix}</span>
                    <span className="absolute left-0 top-0 whitespace-nowrap">
                        {renderChars(phrase.prefix, phrase.verb.length)}
                    </span>
                </span>
                <span
                    className="relative italic inline-block text-[2rem] leading-tight md:text-display-large whitespace-nowrap">
                    <span className="opacity-0 text-primary">{phrase.highlight}</span>
                    <span className="absolute left-0 top-0 text-primary whitespace-nowrap">
                        {renderChars(phrase.highlight, phrase.verb.length + phrase.prefix.length)}
                        {underlineReady && (
                            <div className="absolute top-0 right-0 w-full h-full">
                              <Underline className="text-primary/30" delay={0}/>
                            </div>
                        )}
                    </span>
                </span>
            </span>
        </>
    );
};
