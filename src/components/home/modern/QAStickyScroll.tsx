"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import { Icon } from "@udixio/ui-react";
import { iChat } from "@udixio/icons-rounded-400/chat";
import { iCheckCircle } from "@udixio/icons-rounded-400/check_circle";

const items = [
  {
    id: "cadrage",
    question: "Comment éviter les mauvaises surprises sur le budget ?",
    title: "Périmètre défini, devis précis",
    desc: "Un atelier initial permet de cadrer le projet et fixer un devis avant tout développement.",
  },
  {
    id: "transparence",
    question: "Où en est mon projet ?",
    title: "Suivi clair à chaque étape",
    desc: "Vous suivez l’avancement, validez les étapes et comprenez les décisions prises.",
  },
  {
    id: "expertise",
    question: "Mon site sera-t-il performant et visible ?",
    title: "Performance et SEO solides",
    desc: "Chaque choix technique vise un site rapide, bien référencé et durable.",
  },
  {
    id: "independance",
    question: "Suis-je dépendant après la livraison ?",
    title: "Contrôle total sur votre site",
    desc: "Accès, code source, hébergement : vous gardez la main, sans dépendance.",
  },
];

export const QAStickyScroll = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [dims, setDims] = useState({
    containerTop: 0,
    containerHeight: 0,
    leftHeight: 0,
  });

  useEffect(() => {
    const measure = () => {
      if (!containerRef.current || !leftRef.current) return;
      setDims({
        containerTop:
          containerRef.current.getBoundingClientRect().top + window.scrollY,
        containerHeight: containerRef.current.offsetHeight,
        leftHeight: leftRef.current.offsetHeight,
      });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Re-measure after fonts/images load
  useEffect(() => {
    const t = setTimeout(() => {
      if (!containerRef.current || !leftRef.current) return;
      setDims({
        containerTop:
          containerRef.current.getBoundingClientRect().top + window.scrollY,
        containerHeight: containerRef.current.offsetHeight,
        leftHeight: leftRef.current.offsetHeight,
      });
    }, 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveIndex(Number((entry.target as HTMLElement).dataset.index));
          }
        });
      },
      { threshold: 0.5 },
    );
    itemRefs.current.forEach((ref) => ref && observer.observe(ref));
    return () => observer.disconnect();
  }, []);

  const { scrollY } = useScroll();

  const y = useTransform(scrollY, (scroll) => {
    const { containerTop, containerHeight, leftHeight } = dims;
    if (!containerHeight || !leftHeight) return 0;
    const vh = window.innerHeight;
    const scrolled = scroll - containerTop;
    const ideal = scrolled + vh / 2 - leftHeight / 2;
    const maxY = containerHeight - leftHeight;
    return Math.max(0, Math.min(ideal, maxY));
  });

  return (
    <div
      ref={containerRef}
      className="relative flex gap-12 lg:gap-20 max-w-5xl mx-auto"
    >
      {/* Gauche — scroll-driven */}
      <div className="hidden md:block w-5/12 shrink-0">
        <motion.div ref={leftRef} style={{ y }} className="flex flex-col gap-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex flex-col gap-4"
            >
              <div className="flex items-center gap-2 text-on-surface-variant/50 text-label-medium">
                <Icon className="size-4" icon={iChat} />
                <span>Vous vous demandez…</span>
              </div>
              <p className="text-headline-small font-medium text-on-surface leading-snug">
                "{items[activeIndex].question}"
              </p>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Droite — items dans le flux normal */}
      <div className="flex flex-col w-full md:w-7/12">
        {items.map((item, i) => (
          <div
            key={item.id}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            data-index={i}
            className="flex flex-col gap-4 min-h-[60vh] justify-center py-16 border-b border-outline-variant/20 last:border-0"
          >
            <div className="flex items-start gap-3 md:hidden">
              <Icon
                className="size-5 text-on-surface-variant/50 shrink-0 mt-0.5"
                icon={iChat}
              />
              <p className="text-body-large italic text-on-surface-variant/70 leading-snug">
                "{item.question}"
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Icon
                className="size-6 text-primary shrink-0 mt-0.5"
                icon={iCheckCircle}
              />
              <h3 className="text-title-large font-bold text-on-surface">
                {item.title}
              </h3>
            </div>
            <p className="text-body-large text-on-surface-variant leading-relaxed pl-9">
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
