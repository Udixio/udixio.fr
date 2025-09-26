import {Card as UdixioCard} from "@udixio/ui-react"
import type {HTMLAttributes, ReactNode} from "react";

export const Card = ({children, className, ...restProps}: {
    children: ReactNode,
    className?: string
} & HTMLAttributes<HTMLDivElement>) => {

    return <UdixioCard variant={"filled"} {...restProps}
                       className={className + ' rounded-3xl bg-surface-container-low/80 backdrop-blur-3xl'}>
        {children}
    </UdixioCard>
}