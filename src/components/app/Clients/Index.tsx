import React, {useEffect, useRef, useState} from "react";
import {withState} from '@astrojs/react/actions';
import {useActionState} from "react";
import {actions} from 'astro:actions';
import {appService} from "@/stores/appStore";

type Client = {
  id: string;
  commercialNotes?: string | null;
  user: { id: string; name: string; email: string };
};

type ListState = { items: Client[]; total: number } | undefined;

const listClients = withState(actions.listClients);
const createClient = withState(actions.createClient);
const importClientsCsv = withState(actions.importClientsCsv);

export default function ClientsIndex() {
  const [q, setQ] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  const [listState, listAction, listPending] = useActionState<ListState, FormData>(listClients, undefined);
  const [createState, createAction, createPending] = useActionState<any, FormData>(createClient, undefined);
  const [importState, importAction, importPending] = useActionState<any, FormData>(importClientsCsv, undefined);

  useEffect(() => {
    appService.set({
      actions: [
        { label: "Nouveau client", action: () => setShowCreate(true) },
        { label: "Importer CSV", action: () => setShowImport(true) },
        { label: "Rafraîchir", action: () => formRef.current?.requestSubmit() },
      ]
    });
  }, [q]);

  const items = listState?.items ?? [];

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Clients</h1>

      <form ref={formRef} className="flex gap-2 items-end" action={listAction}>
        <div>
          <label className="block text-sm">Recherche</label>
          <input name="q" value={q} onChange={(e)=>setQ(e.target.value)} className="border px-2 py-1" placeholder="Nom ou email..."/>
        </div>
        <button type="submit" className="border px-3 py-1">{listPending? 'Chargement...' : 'Filtrer'}</button>
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
            <tr><td className="border p-4" colSpan={3}>Aucun client</td></tr>
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
          <form action={createAction} onSubmit={()=>setShowCreate(false)} className="space-y-2">
            <div>
              <label className="block text-sm">User ID</label>
              <input name="userId" required className="border px-2 py-1 w-full" placeholder="user_..."/>
            </div>
            <div>
              <label className="block text-sm">Notes commerciales</label>
              <input name="commercialNotes" className="border px-2 py-1 w-full"/>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="border px-3 py-1">{createPending? 'Création...' : 'Créer'}</button>
              <button type="button" className="border px-3 py-1" onClick={()=>setShowCreate(false)}>Annuler</button>
            </div>
          </form>
        </div>
      )}

      {showImport && (
        <div className="p-3 border rounded">
          <h2 className="font-medium mb-2">Importer CSV</h2>
          <p className="text-sm mb-2">Colonnes requises: <code>userId</code>. Optionnel: <code>commercialNotes</code>.</p>
          <form action={importAction} onSubmit={()=>setShowImport(false)} className="space-y-2">
            <textarea name="csv" className="border w-full h-32" placeholder="userId,commercialNotes\nuser_123,VIP"/>
            <div className="flex gap-2">
              <button type="submit" className="border px-3 py-1">{importPending? 'Import...' : 'Importer'}</button>
              <button type="button" className="border px-3 py-1" onClick={()=>setShowImport(false)}>Annuler</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
