import React, {useEffect, useRef, useState} from "react";
import {withState} from '@astrojs/react/actions';
import {useActionState} from "react";
import {actions} from 'astro:actions';
import {appService} from "@/stores/appStore";

type Organization = {
  id: string;
  name: string;
  slug: string;
  lifecycle: string;
  website?: string | null;
};

type ListState = { items: Organization[]; total: number } | undefined;

const listOrganizations = withState(actions.listOrganizations);
const createOrganization = withState(actions.createOrganization);
const importOrganizationsCsv = withState(actions.importOrganizationsCsv);

export default function OrganizationsIndex() {
  const [filters, setFilters] = useState({ q: "", lifecycle: "" });
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  const [listState, listAction, listPending] = useActionState<ListState, FormData>(listOrganizations, undefined);
  const [createState, createAction, createPending] = useActionState<any, FormData>(createOrganization, undefined);
  const [importState, importAction, importPending] = useActionState<any, FormData>(importOrganizationsCsv, undefined);

  useEffect(() => {
    appService.set({
      actions: [
        { label: "Nouvelle organisation", action: () => setShowCreate(true) },
        { label: "Importer CSV", action: () => setShowImport(true) },
        { label: "Rafraîchir", action: () => formRef.current?.requestSubmit() },
      ]
    });
  }, [filters]);

  const items = listState?.items ?? [];

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Organisations</h1>

      <form ref={formRef} className="grid gap-2 grid-cols-2 md:grid-cols-4 items-end" action={listAction}
            onChange={(e)=>{
              const t = e.target as HTMLInputElement;
              if (!t.name) return;
              setFilters(prev=>({...prev, [t.name]: t.value}));
            }}>
        <div>
          <label className="block text-sm">Recherche</label>
          <input name="q" defaultValue={filters.q} className="border px-2 py-1" placeholder="Nom..."/>
        </div>
        <div>
          <label className="block text-sm">Lifecycle</label>
          <select name="lifecycle" defaultValue={filters.lifecycle} className="border px-2 py-1">
            <option value="">—</option>
            <option value="POTENTIAL">POTENTIAL</option>
            <option value="QUALIFIED">QUALIFIED</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="PAUSED">PAUSED</option>
            <option value="NOT_POSSIBLE">NOT_POSSIBLE</option>
            <option value="LOST">LOST</option>
            <option value="CLOSED">CLOSED</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </div>
        <button type="submit" className="border px-3 py-1">{listPending? 'Chargement...' : 'Filtrer'}</button>
      </form>

      <div className="overflow-auto">
        <table className="min-w-[800px] border" cellPadding={6}>
          <thead>
          <tr>
            <th className="border">Nom</th>
            <th className="border">Slug</th>
            <th className="border">Lifecycle</th>
            <th className="border">Site</th>
          </tr>
          </thead>
          <tbody>
          {items.length === 0 && (
            <tr><td className="border p-4" colSpan={4}>Aucune organisation</td></tr>
          )}
          {items.map(o => (
            <tr key={o.id}>
              <td className="border">{o.name}</td>
              <td className="border">{o.slug}</td>
              <td className="border">{o.lifecycle}</td>
              <td className="border">{o.website ?? ''}</td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="p-3 border rounded">
          <h2 className="font-medium mb-2">Créer une organisation</h2>
          <form action={createAction} onSubmit={()=>setShowCreate(false)} className="grid gap-2 grid-cols-1 md:grid-cols-2">
            <div>
              <label className="block text-sm">Nom</label>
              <input name="name" required className="border px-2 py-1 w-full"/>
            </div>
            <div>
              <label className="block text-sm">Slug</label>
              <input name="slug" required className="border px-2 py-1 w-full"/>
            </div>
            <div>
              <label className="block text-sm">Lifecycle</label>
              <select name="lifecycle" className="border px-2 py-1 w-full">
                <option value="">—</option>
                <option value="POTENTIAL">POTENTIAL</option>
                <option value="QUALIFIED">QUALIFIED</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="PAUSED">PAUSED</option>
                <option value="NOT_POSSIBLE">NOT_POSSIBLE</option>
                <option value="LOST">LOST</option>
                <option value="CLOSED">CLOSED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>
            <div>
              <label className="block text-sm">Site web</label>
              <input name="website" className="border px-2 py-1 w-full"/>
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
          <p className="text-sm mb-2">Colonnes requises: <code>name,slug</code>. Optionnel: <code>lifecycle,website,notes</code>.</p>
          <form action={importAction} onSubmit={()=>setShowImport(false)} className="space-y-2">
            <textarea name="csv" className="border w-full h-32" placeholder="name,slug,lifecycle,website,notes\nAcme,acme,ACTIVE,https://acme.com,Note"/>
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
