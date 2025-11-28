import React, {useEffect, useState} from "react";

import {appService} from "@/stores/appStore";
import DynamicDataCreate from "@components/app/form/DynamicDataCreate.tsx";
import {Card} from "@udixio/ui-react";
import DynamicDatatable from "@components/app/preview/DynamicDatatable.tsx";
import {faEyes} from "@fortawesome/pro-regular-svg-icons";


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
            <h1 className="text-xl font-semibold">Deals</h1>
            <DynamicDatatable
                key={refreshKey}
                model="Deal"
                pageSize={25}
                rowActions={() => [
                    {
                        href: (row) => {
                            return "/deals/" + row.id;
                        },
                        label: "Voir",
                        icon: faEyes
                    }
                ]}
                presets={[
                    {label: "Tous", filter: {}},
                    {label: "Lead", filter: {status: "LEAD"}},
                    {label: "Qualified", filter: {status: "QUALIFIED"}},
                    {label: "Proposal sent", filter: {status: "PROPOSAL_SENT"}},
                    {label: "Won", filter: {status: "WON"}},
                    {label: "Lost", filter: {status: "LOST"}},
                    {label: "On hold", filter: {status: "ON_HOLD"}},
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

            {/*{showImport && (*/}
            {/*    <div className="p-3 border rounded">*/}
            {/*        <h2 className="font-medium mb-2">Importer CSV</h2>*/}
            {/*        <p className="text-sm mb-2">Colonnes requises: <code>title,organizationId</code>.*/}
            {/*            Optionnel: <code>projectId,clientId,userId,amount,probability,status</code>.</p>*/}
            {/*        <form action={importAction} onSubmit={() => setShowImport(false)} className="space-y-2">*/}
            {/*            <textarea name="csv" className="border w-full h-32"*/}
            {/*                      placeholder="title,organizationId,projectId,clientId,userId,amount,probability,status\nRefonte site,org_123,proj_123,client_123,,10000,70,QUALIFIED"/>*/}
            {/*            <div className="flex gap-2">*/}
            {/*                <button type="submit"*/}
            {/*                        className="border px-3 py-1">{importPending ? 'Import...' : 'Importer'}</button>*/}
            {/*                <button type="button" className="border px-3 py-1"*/}
            {/*                        onClick={() => setShowImport(false)}>Annuler*/}
            {/*                </button>*/}
            {/*            </div>*/}
            {/*        </form>*/}
            {/*    </div>*/}
            {/*)}*/}

        </div>
    );
}