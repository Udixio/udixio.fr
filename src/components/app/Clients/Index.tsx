import React, {useEffect, useRef, useState, useTransition} from "react";
import {appService} from "@/stores/appStore";
import DynamicModelForm from "@components/app/DynamicModelForm.tsx";

type Client = {
    id: string;
    commercialNotes?: string | null;
    user: { id: string; name: string; email: string };
};

type ListState = { items: Client[]; total: number } | undefined;

async function callAction<T = any>(name: string, payload?: any): Promise<T> {
    const res = await fetch(`/_actions/${name}/`, {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify(payload ?? {}),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Action ${name} failed (${res.status})`);
    }
    return res.json();
}

export default function ClientsIndex() {
    const [q, setQ] = useState("");
    const [showCreate, setShowCreate] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const formRef = useRef<HTMLFormElement | null>(null);

    const [listState, setListState] = useState<ListState>(undefined);
    const [pending, startTransition] = useTransition();
    const [busyImport, setBusyImport] = useState(false);
    const [createError, setCreateError] = useState<string | undefined>(undefined);

    useEffect(() => {
        appService.set({
            actions: [
                {label: "Nouveau client", action: () => setShowCreate(true)},
                {label: "Importer CSV", action: () => setShowImport(true)},
                {label: "Rafraîchir", action: () => reloadList()},
            ]
        });
    }, [q]);

    // Charger une première fois la liste
    useEffect(() => {
        if (!listState && !pending) reloadList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const reloadList = () => {
        startTransition(async () => {
            const data = await callAction<ListState extends infer U ? any : any>('listClients', q ? {q} : {});
            setListState(data);
        });
    };

    const items = listState?.items ?? [];

    return (
        <div className="p-4 space-y-4">
            <h1 className="text-xl font-semibold">Clients</h1>

            <form ref={formRef} className="flex gap-2 items-end" onSubmit={(e) => {
                e.preventDefault();
                reloadList();
            }}>
                <div>
                    <label className="block text-sm">Recherche</label>
                    <input name="q" value={q} onChange={(e) => setQ(e.target.value)} className="border px-2 py-1"
                           placeholder="Nom ou email..."/>
                </div>
                <button type="submit" className="border px-3 py-1">{pending ? 'Chargement...' : 'Filtrer'}</button>
            </form>

            <div className="overflow-auto">
                <table className="min-w-[700px] border" cellPadding={6}>
                    <thead>
                    <tr>
                        <th className="border">User</th>
                        <th className="border">Email</th>
                        <th className="border">Notes commerciales</th>
                    </tr>
                    </thead>
                    <tbody>
                    {items.length === 0 && (
                        <tr>
                            <td className="border p-4" colSpan={3}>Aucun client</td>
                        </tr>
                    )}
                    {items.map(c => (
                        <tr key={c.id}>
                            <td className="border">{c.user.name}</td>
                            <td className="border">{c.user.email}</td>
                            <td className="border">{c.commercialNotes ?? ''}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            {showCreate && (
                <div className="p-3 border rounded">
                    <h2 className="font-medium mb-2">Créer un client</h2>
                    <div className="space-y-3">
                        <p className="text-sm text-gray-600">Le formulaire est 100% généré à partir du modèle Prisma «
                            Client » et s’appuie sur Formik. Renseignez au minimum le champ userId requis.</p>
                        <DynamicModelForm
                            model="Client"
                            // On exclut les champs techniques non éditables
                            exclude={["id", "createdAt", "updatedAt"]}
                            submitLabel={'Créer'}
                            onSubmit={async (vals) => {
                                setCreateError(undefined);
                                await startTransition(async () => {
                                    try {
                                        await callAction('createEntity', {
                                            model: 'Client',
                                            dataJson: JSON.stringify(vals || {})
                                        });
                                        setShowCreate(false);
                                        reloadList();
                                    } catch (e: any) {
                                        setCreateError(String(e?.message || e));
                                    }
                                });
                            }}
                        />
                        {createError && (
                            <div className="text-sm text-red-600">Erreur: {createError}</div>
                        )}
                        <div className="flex items-center justify-end gap-2">
                            <button type="button" className="border px-3 py-1"
                                    onClick={() => setShowCreate(false)}>Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showImport && (
                <div className="p-3 border rounded">
                    <h2 className="font-medium mb-2">Importer CSV</h2>
                    <p className="text-sm mb-2">Colonnes requises: <code>userId</code>.
                        Optionnel: <code>commercialNotes</code>.</p>
                    <ImportCsvBlock onClose={() => setShowImport(false)}
                                    doImport={(csv) => {
                                        setBusyImport(true);
                                        return callAction('importClientsCsv', {csv}).then(() => {
                                            setShowImport(false);
                                            reloadList();
                                        }).finally(() => setBusyImport(false));
                                    }} pending={busyImport}/>
                </div>
            )}
        </div>
    );
}

function ImportCsvBlock({onClose, doImport, pending}: {
    onClose: () => void;
    doImport: (csv: string) => Promise<any>;
    pending: boolean
}) {
    const [csv, setCsv] = useState("");
    return (
        <form onSubmit={(e) => {
            e.preventDefault();
            doImport(csv);
        }} className="space-y-2">
            <textarea value={csv} onChange={(e) => setCsv(e.target.value)} className="border w-full h-32"
                      placeholder={"userId,commercialNotes\nuser_123,VIP"}/>
            <div className="flex gap-2">
                <button type="submit" className="border px-3 py-1">{pending ? 'Import...' : 'Importer'}</button>
                <button type="button" className="border px-3 py-1" onClick={onClose}>Annuler</button>
            </div>
        </form>
    );
}
