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
    const [subIndex, setSubIndex] = useState(initialFullLength);
    const [reverse, setReverse] = useState(false);
    const [isStarted, setIsStarted] = useState(false); // To handle the initial pause

    // Typing effect
    useEffect(() => {
        const fullLength = phrases[index].verb.length + phrases[index].prefix.length + phrases[index].highlight.length;

        if (!isStarted) {
            const timeout = setTimeout(() => {
                setIsStarted(true);
                setReverse(true);
            }, 3000); // Initial display time before first deletion
            return () => clearTimeout(timeout);
        }

        if (subIndex === fullLength + 1 && !reverse) {
            // Pause before deleting
            const timeout = setTimeout(() => {
                setReverse(true);
            }, 2500);
            return () => clearTimeout(timeout);
        }

        if (subIndex === 0 && reverse) {
            setReverse(false);
            setIndex((prev) => (prev + 1) % phrases.length);
            return;
        }

        const timeout = setTimeout(() => {
            setSubIndex((prev) => prev + (reverse ? -1 : 1));
        }, Math.max(reverse ? 20 : subIndex === fullLength ? 1000 : 40, Math.random() * 40));

        return () => clearTimeout(timeout);
    }, [subIndex, index, reverse, isStarted]);

    const phrase = phrases[index];
    const fullLength = phrase.verb.length + phrase.prefix.length + phrase.highlight.length;

    const visibleVerb = phrase.verb.substring(0, Math.min(subIndex, phrase.verb.length));
    const isShowingPrefix = subIndex > phrase.verb.length;

    const visiblePrefix = isShowingPrefix
        ? phrase.prefix.substring(0, Math.min(subIndex - phrase.verb.length, phrase.prefix.length))
        : "";

    const isShowingHighlight = subIndex > phrase.verb.length + phrase.prefix.length;

    const visibleHighlight = isShowingHighlight
        ? phrase.highlight.substring(0, subIndex - phrase.verb.length - phrase.prefix.length)
        : "";

    return (
        <>
            {/* Row 2: Progressive Indent (Staircase) */}
            <span
                className="self-center flex h-16 md:h-24 text-display-large text-outline mt-2 md:-mt-6 relative whitespace-nowrap"
            >
                <span className="opacity-0">{phrase.verb}</span>
                <span className="absolute left-0 top-0">
                    {visibleVerb}
                    {!isShowingPrefix && <span className="animate-pulse border-r-4 border-on-surface ml-1"></span>}
                </span>
            </span>

            {/* Row 3: Further Indent */}
            <span
                className="self-end flex flex-col md:flex-row items-baseline gap-2 md:gap-6 mt-2 md:-mt-6 min-h-20 md:min-h-32">
                <span
                    className="relative text-headline-medium lowercase text-on-surface whitespace-nowrap min-h-8">
                    <span className="opacity-0">{phrase.prefix}</span>
                    <span className="absolute left-0 top-0">
                        {visiblePrefix}
                        {isShowingPrefix && !isShowingHighlight &&
                            <span className="animate-pulse border-r-2 border-on-surface ml-1"></span>}
                    </span>
                </span>
                <span
                    className="relative italic inline-block text-[2rem] leading-tight md:text-display-large whitespace-nowrap">
                    <span className="opacity-0 text-gradient">{phrase.highlight}</span>
                    <span className="absolute left-0 top-0 text-gradient">
                        {visibleHighlight}
                        {isShowingHighlight && <span className="animate-pulse border-r-4 border-primary ml-1"></span>}
                        {isShowingHighlight && subIndex >= fullLength && !reverse && (
                            <Underline className="text-primary/30" delay={0.1}/>
                        )}
                    </span>
                </span>
            </span>
        </>
    );
};
