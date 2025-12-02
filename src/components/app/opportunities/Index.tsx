import React, {useEffect, useState} from "react";

import {appService} from "@/stores/appStore";
import DynamicDataCreate from "@components/app/form/DynamicDataCreate.tsx";
import {Card, Divider, Icon, IconButton} from "@udixio/ui-react";
import DynamicDatatable from "@components/app/preview/DynamicDatatable.tsx";
import {faEnvelope, faFolderOpen, faPhone, faXmark} from "@fortawesome/pro-regular-svg-icons";
import DynamicDataImport from "@components/app/import/DynamicDataImport.tsx";
import DynamicView from "../preview/DynamicView";
import {actions} from 'astro:actions';
import {useStore} from "@nanostores/react";
import {modelsStore} from "@/stores/modelsStore.ts";


export default function LeadsIndex() {
    // Clé pour forcer le re-montage du tableau (rafraîchissement)
    const [refreshKey, setRefreshKey] = useState(0);
    const [showCreate, setShowCreate] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const {models} = useStore(modelsStore);

    useEffect(() => {
        appService.set({
            actions: [
                {label: "Nouveau deal", action: () => setShowCreate(true)},
                {label: "Importer CSV", action: () => setShowImport(true)},
                {
                    label: "Rafraîchir", action: () => setRefreshKey((k) => k + 1)
                },
            ]
        });
    }, []);

    return (
        <Card variant={"filled"} className="bg-surface-container-low  space-y-4 section my-8  overflow-y-auto">
            <h1 className="text-display-large">Leads</h1>
            <DynamicDatatable
                key={refreshKey}
                model="Deal"
                pageSize={25}
                rowActions={() => [
                    {
                        href: (row) => {
                            return "/deals/" + row.id;
                        },
                        label: "Ouvrir",
                        icon: faFolderOpen
                    }
                ]}
                presets={[
                    {label: "Tout voir", filter: {}},
                    {
                        label: "🔥 Hot Deals (>60%)",
                        filter: {
                            // Ici on ne veut que les certitudes, donc gt: 60 exclut les nulls
                            status: {in: ["QUALIFIED", "PROPOSAL_SENT"]},
                            probability: {gt: 60}
                        }
                    },
                    {
                        label: "💰 Gros Volumes (>10k€)",
                        filter: {
                            // On inclut gt 10k. Les montants nulls (0 ou inconnus) sont exclus
                            amount: {gt: 10000},
                            status: {notIn: ["WON", "LOST", "ON_HOLD"]}
                        }
                    },
                    {
                        label: "🏁 Devis envoyés",
                        filter: {status: "PROPOSAL_SENT"}
                    },
                    {
                        label: "⚠️ Faible proba ou Inconnue",
                        filter: {
                            status: {notIn: ["WON", "LOST"]},
                            // On utilise OR pour attraper les <20 ET les nulls
                            OR: [
                                {probability: {lt: 20}},
                                {probability: {equals: null}}
                            ]
                        }
                    }
                ]}
            />
            <div className={"my-32"}></div>
            <DynamicView
                action={actions.opportunities.list}
                entityRender={(args) => {
                    const {clients, deal, projects, organization} = args


                    const colorDealStatus = Object.values(models?.DealStatus.values).find((status: any) => status.name === deal.status)?.ui?.color ?? 'surface'

                    console.log(args)

                    return (
                        <Card variant={'filled'} className="bg-surface-container p-4  space-y-4">

                            <div className={"px-2 flex justify-between items-center mb-4"}>
                                <p className={"text-title-medium"}>{deal.title}</p>

                                <div

                                    style={{
                                        backgroundColor: colorDealStatus ? `var(--color-${colorDealStatus})` : undefined,
                                        color: colorDealStatus ? `var(--color-on-${colorDealStatus})` : undefined,
                                    }}
                                    className={"rounded-full text-uppercase p-2 py-1"}>
                                    <p className={"text-label-large "}>{deal.status}</p>
                                </div>
                            </div>

                            <div className={"flex  gap-2"}>
                                {
                                    organization &&
                                    <Card
                                        variant="filled"
                                        className="bg-surface-container-high flex-1 p-3 rounded-xl"
                                    >
                                        <p className="text-label-small text-on-surface-variant mb-1">
                                            Entreprise
                                        </p>
                                        <p className="text-body-medium ">
                                            {organization.name}
                                        </p>
                                        <p className="text-body-small text-on-surface-variant">
                                            {organization.city} — {organization.country}
                                        </p>
                                    </Card>

                                }

                                {
                                    deal.amount &&
                                    <Card variant={'filled'} className="bg-surface-container-high flex-1  p-2">
                                        <p className={"text-label-small text-on-surface-variant mb-1"}>Montant</p>
                                        <p className={"text-body-small"}>{deal.amount} <span
                                            className={"text-body-small text-on-surface-variant"}>€</span></p>
                                    </Card>
                                }

                            </div>

                            {clients &&
                                clients.map(client => {

                                    const firstName: string = client.user?.firstName ?? client.user?.name.split(' ')[0] ?? ''
                                    const lastName: string = client.user?.lastName ?? client.user?.name.split(' ')[1] ?? ''

                                    let email = client.contactPoints.find(contactPoint => contactPoint.channel === 'EMAIL')?.value ?? client.user?.email
                                    const phone = client.contactPoints.find(contactPoint => contactPoint.channel === 'PHONE_MOBILE')?.value ?? client.contactPoints.find(contactPoint => contactPoint.channel === 'PHONE_LANDLINE')?.value

                                    if (email == "unknown") email = undefined


                                    return (
                                        <Card variant={'filled'} className="bg-surface-container-high flex-1  p-4">
                                            <div className={"flex justify-between items-center mb-2"}>
                                                <div className={"flex items-center gap-4"}>
                                                    <div

                                                        style={{
                                                            backgroundColor: colorDealStatus ? `var(--color-${colorDealStatus})` : undefined,
                                                            color: colorDealStatus ? `var(--color-on-${colorDealStatus})` : undefined,
                                                        }}
                                                        className={"rounded-full size-12 text-title-medium  flex items-center justify-center text-uppercase"}>{firstName.slice(0, 1)}{lastName.slice(0, 1)}</div>
                                                    <p className={"text-title-large  mb-1"}>{firstName} {lastName}</p>
                                                </div>
                                                <div className={"flex gap-2"}>
                                                    {email && (
                                                        <IconButton size={"small"} variant={"outlined"}
                                                                    href={`mailto:${email}`}
                                                                    icon={faEnvelope}>Envoyer
                                                            un mail à {firstName}</IconButton>
                                                    )}
                                                    {phone && (
                                                        <IconButton size={"small"} variant={"outlined"}
                                                                    href={`tel:${phone}`}
                                                                    icon={faPhone}>Appeler {firstName}</IconButton>
                                                    )}
                                                </div>
                                            </div>

                                            <div className={"flex gap-2 ml-2 mt-2"}>
                                                {email && (
                                                    <div
                                                        className={"text-body-small text-on-surface-variant flex gap-1 items-center"}>
                                                        <Icon className={"size-4"} icon={faEnvelope}/>{email}
                                                    </div>
                                                )}
                                                {phone && (
                                                    <div
                                                        className={"text-body-small text-on-surface-variant flex gap-1 items-center"}>
                                                        <Icon className={"size-4"} icon={faPhone}/>{phone}
                                                    </div>
                                                )}
                                            </div>
                                        </Card>
                                    )
                                })
                            }

                            {projects &&
                                projects.map(project => {


                                    return (
                                        <Card variant={'filled'} className="bg-surface-container-high flex-1  p-4">
                                            <p className={"text-title-medium  mb-1"}>{project.name}</p>
                                            <p className={"text-body-small"}>{project.description}</p>
                                            {
                                                project.websites.map((website, index: number) => {
                                                    const domain = website.domains.find(domain => domain.isPrimary)

                                                    return (
                                                        <>
                                                            {index > 0 && <Divider className={"my-2"}/>}
                                                            <div>
                                                                {domain &&
                                                                    <a className={"text-on-surface-variant hover:underline hover:text-primary"}
                                                                       target={"_blank"}
                                                                       href={"https://" + domain.host}>{domain.host}</a>}
                                                            </div>
                                                        </>
                                                    )
                                                })
                                            }
                                        </Card>
                                    )
                                })
                            }
                            {
                                deal.dealTagLinks &&
                                <div className={"flex flex-wrap gap-2 mt-4"}>
                                    {deal.dealTagLinks.map(dealTagLink => {
                                        return (
                                            <div
                                                style={{
                                                    backgroundColor: dealTagLink.tag.color.includes("#") ? dealTagLink.tag.color : `var(--color-${dealTagLink.tag.color})`,
                                                    color: dealTagLink.tag.color.includes("#") ? undefined : `var(--color-on-${dealTagLink.tag.color})`
                                                }}
                                                className={"text-body-small rounded-full px-4 p-2"}>{dealTagLink.tag.name}</div>
                                        )
                                    })}
                                </div>
                            }

                        </Card>
                    )
                }}
                columns={[
                    {
                        key: "name",
                        label: "Entreprise",
                    },
                    {
                        key: "contact",
                        label: "Contact",
                    },
                    {
                        key: "email",
                        label: "Email",
                    },
                    {
                        key: "phone",
                        label: "Téléphone",
                    },
                    {
                        key: "status",
                        label: "Statut",
                    },
                    {
                        key: "source",
                        label: "Source",
                    },
                    {
                        key: "createdAt",
                        label: "Créé le",
                    },
                ]}
                key={refreshKey}
                pageSize={25}
                rowActions={() => [
                    {
                        href: (row) => {
                            return "/clients/" + row.id;
                        },
                        label: "Ouvrir",
                        icon: faFolderOpen
                    }
                ]}
                presets={[]}
            />
            {showCreate && (
                <Card className="p-4">
                    <h2 className="font-medium mb-2">Créer un deal</h2>

                    <div className="space-y-3">
                        <p className="text-sm text-gray-600">Le formulaire est généré depuis le modèle Prisma « Deal
                            ».</p>
                        <DynamicDataCreate
                            model="Deal"
                            exclude={["id", "createdAt", "updatedAt"]}
                            onCancel={() => setShowCreate(false)}
                            onSuccess={() => {
                                setShowCreate(false);
                                // Rafraîchir la liste
                                setRefreshKey((k) => k + 1);
                            }}
                        />
                        {/* Erreurs de création gérées par le wrapper ou l'action */}
                    </div>
                </Card>
            )}

            {showImport && (
                <Card className="p-4">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-medium">Importer des deals (CSV)</h2>
                        <IconButton icon={faXmark} onClick={() => setShowImport(false)}>Fermer</IconButton>
                    </div>
                    <DynamicDataImport
                        model="Deal"
                        onCancel={() => setShowImport(false)}
                        onSuccess={(count) => {
                            setShowImport(false);
                            setRefreshKey((k) => k + 1);
                        }}
                    />
                </Card>
            )}

        </Card>
    );
}