import React, {useEffect, useRef, useState} from "react";
import {withState} from '@astrojs/react/actions';
import {useActionState} from "react";
import {actions} from 'astro:actions';
import {appService} from "@/stores/appStore";

type Contact = {
  id: string;
  kind: string;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  jobTitle?: string | null;
};

type ListState = { items: Contact[]; total: number } | undefined;

const listContacts = withState(actions.listContacts);
const createContact = withState(actions.createContact);
const importContactsCsv = withState(actions.importContactsCsv);

export default function ContactsIndex() {
  const [filters, setFilters] = useState({ q: "", kind: "" });
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  const [listState, listAction, listPending] = useActionState<ListState, FormData>(listContacts, undefined);
  const [createState, createAction, createPending] = useActionState<any, FormData>(createContact, undefined);
  const [importState, importAction, importPending] = useActionState<any, FormData>(importContactsCsv, undefined);

  useEffect(() => {
    appService.set({
      actions: [
        { label: "Nouveau contact", action: () => setShowCreate(true) },
        { label: "Importer CSV", action: () => setShowImport(true) },
        { label: "Rafraîchir", action: () => formRef.current?.requestSubmit() },
      ]
    });
  }, [filters]);

  const items = listState?.items ?? [];

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Contacts</h1>

      <form ref={formRef} className="grid gap-2 grid-cols-2 md:grid-cols-4 items-end" action={listAction}
            onChange={(e)=>{
              const t = e.target as HTMLInputElement;
              if (!t.name) return;
              setFilters(prev=>({...prev, [t.name]: t.value}));
            }}>
        <div>
          <label className="block text-sm">Recherche</label>
          <input name="q" defaultValue={filters.q} className="border px-2 py-1" placeholder="Nom, entreprise..."/>
        </div>
        <div>
          <label className="block text-sm">Type</label>
          <select name="kind" defaultValue={filters.kind} className="border px-2 py-1">
            <option value="">—</option>
            <option value="PERSON">PERSON</option>
            <option value="GENERIC">GENERIC</option>
          </select>
        </div>
        <button type="submit" className="border px-3 py-1">{listPending? 'Chargement...' : 'Filtrer'}</button>
      </form>

      <div className="overflow-auto">
        <table className="min-w-[800px] border" cellPadding={6}>
          <thead>
          <tr>
            <th className="border">Type</th>
            <th className="border">Nom</th>
            <th className="border">Entreprise</th>
            <th className="border">Titre</th>
          </tr>
          </thead>
          <tbody>
          {items.length === 0 && (
            <tr><td className="border p-4" colSpan={4}>Aucun contact</td></tr>
          )}
          {items.map(c => (
            <tr key={c.id}>
              <td className="border">{c.kind}</td>
              <td className="border">{[c.firstName, c.lastName].filter(Boolean).join(' ')}</td>
              <td className="border">{c.company ?? ''}</td>
              <td className="border">{c.jobTitle ?? ''}</td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="p-3 border rounded">
          <h2 className="font-medium mb-2">Créer un contact</h2>
          <form action={createAction} onSubmit={()=>setShowCreate(false)} className="grid gap-2 grid-cols-1 md:grid-cols-2">
            <div>
              <label className="block text-sm">Type</label>
              <select name="kind" className="border px-2 py-1 w-full" defaultValue="PERSON">
                <option value="PERSON">PERSON</option>
                <option value="GENERIC">GENERIC</option>
              </select>
            </div>
            <div>
              <label className="block text-sm">Prénom</label>
              <input name="firstName" className="border px-2 py-1 w-full"/>
            </div>
            <div>
              <label className="block text-sm">Nom</label>
              <input name="lastName" className="border px-2 py-1 w-full"/>
            </div>
            <div>
              <label className="block text-sm">Entreprise</label>
              <input name="company" className="border px-2 py-1 w-full"/>
            </div>
            <div>
              <label className="block text-sm">Poste</label>
              <input name="jobTitle" className="border px-2 py-1 w-full"/>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm">Canaux (JSON)</label>
              <input name="channels" placeholder='{"emails":["a@b.com"]}' className="border px-2 py-1 w-full"/>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm">Notes</label>
              <input name="notes" className="border px-2 py-1 w-full"/>
            </div>
            <div className="md:col-span-2 flex gap-2 mt-2">
              <button type="submit" className="border px-3 py-1">{createPending? 'Création...' : 'Créer'}</button>
              <button type="button" className="border px-3 py-1" onClick={()=>setShowCreate(false)}>Annuler</button>
            </div>
          </form>
        </div>
      )}

      {showImport && (
        <div className="p-3 border rounded">
          <h2 className="font-medium mb-2">Importer CSV</h2>
          <p className="text-sm mb-2">Colonnes: <code>kind,firstName,lastName,company,jobTitle,channels_json,notes</code>.</p>
          <form action={importAction} onSubmit={()=>setShowImport(false)} className="space-y-2">
            <textarea name="csv" className="border w-full h-32" placeholder='kind,firstName,lastName,company,jobTitle,channels_json,notes
PERSON,Jane,Doe,Acme,CTO,"{""emails"": [""jane@acme.com""]}",VIP'/>
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
