import { useMotionValueEvent, useScroll } from "motion/react";
import {
  type ElementType,
  type ReactNode,
  type RefObject,
  useRef,
  useState,
} from "react";
import { classNames } from "@udixio/ui-react";

export const SectionPadding = ({
  ref: refProps,
  children,
  start,
  end,
  className = "",
  as: Component = "div",
  onClose,
  onOpen,
  ...restProps
}: {
  children: ReactNode;
  start?: boolean;
  end?: boolean;
  className?: string;
  as?: ElementType;
  onClose?: () => void;
  onOpen?: () => void;
  ref?: RefObject<HTMLDivElement> | null | undefined;
}) => {
  const [animation, setAnimation] = useState<"min" | "max">("max");

  const ref = useRef(null);

  const resolvedRef = refProps ?? ref;

  const { scrollYProgress } = useScroll({
    target: resolvedRef,
    offset: ["start 55%", "end 45%"],
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if ((latest >= 1 && end) || (latest <= 0 && start)) {
      setAnimation("min");
      onClose?.();
    } else {
      setAnimation("max");
      onOpen?.();
    }
  });

  return (
    <Component
      ref={resolvedRef}
      className={className + " w-[max(90vw,1920px)] mx-auto max-w-full  "}
      {...restProps}
    >
      <div
        style={{ cornerShape: "superellipse(2)" }}
        className={classNames(
          "overflow-clip mx-auto max-w-full transition-all duration-700 ",
          {
            "min-[1920px]:rounded-[3rem] scale-100 max-w-full ":
              animation == "max",
            "rounded-[8rem] scale-90  max-w-[max(1706px,80%)] ":
              animation == "min",
          },
        )}
      >
        {children}
      </div>
    </Component>
  );
};
