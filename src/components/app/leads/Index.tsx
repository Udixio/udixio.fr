import React, {useEffect, useState} from "react";

import {appService} from "@/stores/appStore";
import DynamicDataCreate from "@components/app/form/DynamicDataCreate.tsx";
import {Card, IconButton} from "@udixio/ui-react";
import DynamicDatatable from "@components/app/preview/DynamicDatatable.tsx";
import {faFolderOpen, faXmark} from "@fortawesome/pro-regular-svg-icons";
import DynamicDataImport from "@components/app/import/DynamicDataImport.tsx";
import DynamicDataView from "@components/app/preview/DynamicDataView.tsx";


export default function ClientsIndex() {
    // Clé pour forcer le re-montage du tableau (rafraîchissement)
    const [refreshKey, setRefreshKey] = useState(0);
    const [showCreate, setShowCreate] = useState(false);
    const [showImport, setShowImport] = useState(false);


    useEffect(() => {
        appService.set({
            actions: [
                {label: "Nouveau client", action: () => setShowCreate(true)},
                {label: "Importer CSV", action: () => setShowImport(true)},
                {
                    label: "Rafraîchir", action: () => setRefreshKey((k) => k + 1)
                },
            ]
        });
    }, []);

    return (
        <div className="space-y-4 section w-full">
            <h1 className="text-display-large">Prospect</h1>
            {
                !showCreate &&
                <><DynamicDatatable
                    key={refreshKey}
                    model="Client"
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
                    <DynamicDataView
                        rowRenderer={(row) => {
                            console.log('rffr', row)
                            return {
                                email: {
                                    value: row.user.email,
                                },
                                phone: {
                                    value: row.user.phone,
                                }
                            }
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
                        model="Client"
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
                </>

            }


            {showCreate && (
                <Card className="p-4">
                    <div className={"flex justify-between items-center mb-4"}>
                        <h2 className="font-medium mb-2">Créer un prospect</h2>
                        <IconButton icon={faXmark} onClick={() => setShowCreate(false)}>Fermer</IconButton>
                    </div>

                    <div className="space-y-3">
                        <p className="text-sm text-gray-600">Le formulaire est généré depuis le modèle Prisma « Client
                            ».</p>
                        <DynamicDataCreate
                            model="Client"
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
                        <h2 className="font-medium">Importer des clients (CSV)</h2>
                        <IconButton icon={faXmark} onClick={() => setShowImport(false)}>Fermer</IconButton>
                    </div>
                    <DynamicDataImport
                        model="Client"
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