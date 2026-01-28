import {Card as UdixioCard, classNames} from "@udixio/ui-react"
import type {HTMLAttributes, ReactNode} from "react";

export const Card = ({children, className, ...restProps}: {
    children: ReactNode,
    className?: string
} & HTMLAttributes<HTMLDivElement>) => {

    return <UdixioCard style={{cornerShape: "superellipse(2)"}} variant={"filled"} {...restProps}
                       className={classNames('rounded-[3rem] bg-surface-container-high/70 backdrop-blur-xl', className)}>
        {children}
    </UdixioCard>
}