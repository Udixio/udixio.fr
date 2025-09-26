import React, {useMemo, useState} from 'react'
import {Button, classNames, Icon} from '@udixio/ui-react'
import {faCircleCheck, faCircleMinus, faCircleXmark} from '@fortawesome/pro-solid-svg-icons'
import {Card} from "@components/Card.tsx";

export type PlanColumn = {
    id: string
    name: string
    price?: string
    badge?: string
}

export type Feature = {
    id: string
    label: string
    // status: true (included), false (not included), 'partial' | string (other)
    value: boolean | 'partial' | string
    note?: string
}

export type FeatureCategory = {
    id: string
    label: string
    features: Feature[]
}

export type CompareGroup = {
    id: string
    label: string
    plans: PlanColumn[] // exactly 4 expected
    categories: FeatureCategory[]
}

export type CompareProps = {
    groups: CompareGroup[]
    initialGroupId?: string
    className?: string
}


// A small pill badge
function Pill({children}: { children: React.ReactNode }) {
    return (
        <span
            className="ml-2 inline-flex items-center rounded-full bg-secondary-container px-2 py-0.5 text-label-small text-on-secondary-container">
      {children}
    </span>
    )
}

// Cell content for status indicators
function StatusCell({value}: { value: Feature['value'] }) {
    if (value === true) {
        return (
            <div className="flex items-center justify-center">
                <Icon className="text-success size-5" icon={faCircleCheck}/>
            </div>
        )
    }
    if (value === false) {
        return (
            <div className="flex items-center justify-center">
                <Icon className="text-error size-5" icon={faCircleXmark}/>
            </div>
        )
    }
    if (value === 'partial') {
        return (
            <div className="flex items-center justify-center">
                <Icon className="text-warning size-5" icon={faCircleMinus}/>
            </div>
        )
    }
    // string or custom rendering
    return <span className="text-body-medium text-center block">{String(value)}</span>
}

export default function Compare({groups, initialGroupId, className}: CompareProps) {
    const initialIndex = Math.max(0, groups.findIndex(g => g.id === initialGroupId))
    const [active, setActive] = useState(initialIndex === -1 ? 0 : initialIndex)

    const current = groups[active]
    const planCount = current?.plans?.length ?? 0
    const tooManyOrFew = planCount !== 4

    const gridCols = useMemo(() => {
        // 1 sticky feature-name column + 4 plan columns
        return `grid-cols-[minmax(220px,0.9fr)_repeat(4,minmax(140px,1fr))]`
    }, [])

    return (
        <div className={classNames('w-full', className)}>
            {/* Tabs */}
            <div role="tablist" aria-label="Sélection du groupe de plans" className="flex gap-2 ">
                {groups.map((g, idx) => (
                    <Button
                        size={"small"}
                        key={g.id}
                        variant={idx === active ? 'filled' : 'outlined'}
                        activated={idx === active}
                        onClick={() => setActive(idx)}
                    >
                        {g.label}
                    </Button>
                ))}
            </div>

            {/* Warning if not exactly 4 plans */}
            {tooManyOrFew && (
                <p className="mt-3 text-warning text-body-small">
                    Astuce: Ce composant est optimisé pour afficher exactement 4 plans. Actuellement: {planCount}.
                </p>
            )}

            {/* Table-like grid */}
            <Card
                variant="outlined"
                id={`compare-panel-${current?.id}`}
                role="tabpanel"
                aria-labelledby={current?.id}
                className="mt-6"
            >
                {/* Header */}
                <div
                    className={classNames(
                        'grid',
                        gridCols,
                        'sticky top-0 z-10'
                    )}
                >
                    <div
                        className="p-4 sticky left-0 z-20 font-medium text-title-small border-b border-outline-variant">
                        Fonctionnalités
                    </div>
                    {current?.plans?.map((plan) => (
                        <div key={plan.id} className="p-4 text-center border-b border-outline-variant">
                            <div className="text-title-small font-semibold">{plan.name}
                                {plan.badge && <Pill>{plan.badge}</Pill>}
                            </div>
                            {plan.price && <div className="text-body-medium opacity-70 mt-1">{plan.price}</div>}
                        </div>
                    ))}
                </div>

                {/* Body */}
                <div className="divide-y divide-outline-variant">
                    {current?.categories?.map((cat) => (
                        <div key={cat.id}>
                            {/* Category row */}
                            <div className={classNames('grid', gridCols, 'bg-secondary-container/20')}>
                                <div
                                    className="sticky left-0 z-10 p-3 bg-secondary-container/50 text-title-small font-medium">
                                    {cat.label}
                                </div>
                                {/* empty header filler cells for category row */}
                                {new Array(4).fill(0).map((_, i) => (
                                    <div key={i} className="p-3"></div>
                                ))}
                            </div>

                            {/* Features rows */}
                            {cat.features.map((f, rowIdx) => (
                                <div key={f.id}
                                     className={classNames('grid group', gridCols,
                                         ' transition-colors',
                                         {
                                             "bg-surface-container-low/50  hover:bg-surface-container-high/80": rowIdx % 2 === 0,
                                             "bg-surface-container/50 hover:bg-surface-container-highest/80 ": rowIdx % 2 !== 0
                                         }
                                     )}>
                                    <div
                                        className={
                                            classNames("sticky left-0 z-10 p-3", {
                                                "bg-surface-container/20": rowIdx % 2 === 0,
                                                "bg-surface-container-high/20": rowIdx % 2 !== 0
                                            })
                                        }>
                                        <div className="text-body-medium">{f.label}</div>
                                        {f.note && <div
                                            className="text-body-small text-on-surface-variant mt-1">{f.note}</div>}
                                    </div>
                                    {current.plans.map((plan) => {
                                        // Here we assume each feature row applies same value across plans? Typically you need per-plan values.
                                        // To keep API minimal, allow f.value to be array per plan if provided as string map. For now, support object mapping too.
                                        let cellValue: Feature['value'] = f.value
                                        // @ts-ignore support map by plan.id
                                        if (typeof f.value === 'object' && f.value !== null && plan.id in (f.value as any)) {
                                            // @ts-ignore
                                            cellValue = (f.value as any)[plan.id]
                                        }
                                        return (
                                            <div key={plan.id} className="p-3 flex items-center justify-center">
                                                <StatusCell value={cellValue}/>
                                            </div>
                                        )
                                    })}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    )
}
