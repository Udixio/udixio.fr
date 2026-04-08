"use client";
import { useInView, useMotionValue, useSpring } from "motion/react";
import { useEffect, useRef, useState } from "react";

export const AnimatedCounter = ({
  target,
  suffix = "",
  prefix = "",
  className = "",
}: {
  target: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const value = useMotionValue(0);
  const spring = useSpring(value, { stiffness: 50, damping: 30 });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (isInView) value.set(target);
  }, [isInView, target, value]);

  useEffect(() => {
    return spring.on("change", (v) => setDisplay(Math.round(v).toString()));
  }, [spring]);

  return (
    <span
      ref={ref}
      className={className}
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {prefix}
      {display}
      {suffix}
    </span>
  );
};
