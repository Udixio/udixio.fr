import {Card as UdixioCard} from "@udixio/ui-react"

export const Card = ({children, className}: { children: React.ReactNode, className?: string }) => {

    return <UdixioCard variant={"filled"}
                       className={className + ' rounded-3xl bg-surface-container-highest/80 backdrop-blur-3xl'}>
        {children}
    </UdixioCard>
}