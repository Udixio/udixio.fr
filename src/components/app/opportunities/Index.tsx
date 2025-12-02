import React, {useEffect, useState} from "react";

import {appService} from "@/stores/appStore";
import DynamicDataCreate from "@components/app/form/DynamicDataCreate.tsx";
import {Card, Icon, IconButton} from "@udixio/ui-react";
import DynamicDatatable from "@components/app/preview/DynamicDatatable.tsx";
import {faEnvelope, faFolderOpen, faXmark} from "@fortawesome/pro-regular-svg-icons";
import DynamicDataImport from "@components/app/import/DynamicDataImport.tsx";
import DynamicView from "../preview/DynamicView";
import {actions} from 'astro:actions';


export default function LeadsIndex() {
    // Clé pour forcer le re-montage du tableau (rafraîchissement)
    const [refreshKey, setRefreshKey] = useState(0);
    const [showCreate, setShowCreate] = useState(false);
    const [showImport, setShowImport] = useState(false);


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
                entityRender={(item) => {
                    const deal = item.deal ?? item; // fallback si jamais format brut
                    const target = item.target?.client ?? item.target?.project ?? item.target?.organization;
                    const targetType = item.target?.type ?? (deal.client ? 'Client' : deal.project ? 'Project' : 'Organization');

                    const client = targetType === 'client' || targetType === 'Client' ? (item.target?.client ?? deal.client) : undefined;

                    return (
                        <Card variant={'filled'} className="bg-surface-container p-2 space-y-2">
                            <div className={"px-2"}>
                                <p className={"text-title-medium"}>{deal.title}</p>
                            </div>
                            {client && <Card variant={'filled'} className="bg-surface-container-high flex-1  p-2">
                                <div>
                                    <p className={"text-title-medium text-on-surface-variant mb-1"}>{client.user?.name}</p>
                                </div>
                                <div>
                                    {client.user?.email && (
                                        <div
                                            className={"text-body-medium text-on-surface-variant flex gap-2 items-center"}>
                                            <Icon icon={faEnvelope}/>{client.user.email}
                                        </div>
                                    )}
                                </div>
                            </Card>}

                            <div className={"flex  gap-2"}>
                                <Card variant={'filled'} className="bg-surface-container-high flex-1  p-2">
                                    <p className={"text-label-medium text-on-surface-variant mb-1"}>Cible</p>
                                    <p className={"text-body-medium"}>{(target?.name ?? target?.organization?.name ?? target?.project?.name) ?? "?"}</p>
                                </Card>
                                <Card variant={'filled'} className="bg-surface-container-high flex-1  p-2">
                                    <p className={"text-label-medium text-on-surface-variant mb-1"}>Statut</p>
                                    <p className={"text-body-medium"}>{deal.status}</p>
                                </Card>
                                <Card variant={'filled'} className="bg-surface-container-high flex-1  p-2">
                                    <p className={"text-label-medium text-on-surface-variant mb-1"}>Montant</p>
                                    <p className={"text-body-medium"}>{deal.amount ?? "?"} <span
                                        className={"text-body-small text-on-surface-variant"}>€</span></p>
                                </Card>
                            </div>
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