import type { CardInterface, ReactProps } from "@udixio/ui-react";
import { Card as UdixioCard, classNames } from "@udixio/ui-react";
import type { ReactNode } from "react";

export const Card = ({
  children,
  className,
  ...restProps
}: {
  children: ReactNode;
  className?: string;
} & ReactProps<CardInterface>) => {
  return (
    <UdixioCard
      style={{ cornerShape: "superellipse(2)" }}
      variant={restProps?.variant ?? "filled"}
      {...restProps}
      className={classNames(
        "rounded-[3rem] bg-surface-container-high/70 bg-radial-[at_90%_90%]" +
          " from-tertiary-container/20 to-transparent backdrop-blur-xl ",
        className,
      )}
    >
      {children}
    </UdixioCard>
  );
};
