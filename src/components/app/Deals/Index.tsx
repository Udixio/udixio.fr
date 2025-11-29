import React, {useEffect, useState} from "react";

import {appService} from "@/stores/appStore";
import DynamicDataCreate from "@components/app/form/DynamicDataCreate.tsx";
import {Card, IconButton} from "@udixio/ui-react";
import DynamicDatatable from "@components/app/preview/DynamicDatatable.tsx";
import {faFolderOpen} from "@fortawesome/pro-regular-svg-icons";
import {faXmark} from "@fortawesome/pro-regular-svg-icons";
import DynamicDataImport from "@components/app/import/DynamicDataImport.tsx";


export default function DealsIndex() {
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
        <div className="p-4 space-y-4">
            <h1 className="text-display-large">Deals</h1>
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

        </div>
    );
}