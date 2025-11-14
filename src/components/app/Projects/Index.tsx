import React, {useEffect, useMemo, useState} from "react";
import {withState} from '@astrojs/react/actions';
import {useActionState} from "react";
import {actions} from 'astro:actions';
import {appService} from "@/stores/appStore";

type Project = {
  id: string;
  name: string;
  description?: string | null;
  organizationId: string;
  organization?: { id: string; name: string };
};

type ListState = { items: Project[]; total: number } | undefined;

const listProjects = withState(actions.listProjects);
const createProject = withState(actions.createProject);
const importProjectsCsv = withState(actions.importProjectsCsv);

export default function ProjectsIndex() {
  const [query, setQuery] = useState("");
  const [orgId, setOrgId] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const [listState, listAction, listPending] = useActionState<ListState, FormData>(listProjects, undefined);
  const [createState, createAction, createPending] = useActionState<any, FormData>(createProject, undefined);
  const [importState, importAction, importPending] = useActionState<any, FormData>(importProjectsCsv, undefined);

  // Expose page actions to FAB
  useEffect(() => {
    appService.set({
      actions: [
        {label: "Nouveau projet", action: () => setShowCreate(true)},
        {label: "Importer CSV", action: () => setShowImport(true)},
        {label: "Rafraîchir", action: () => {
          const fd = new FormData();
          if (query) fd.set("q", query);
          if (orgId) fd.set("organizationId", orgId);
          listAction(fd);
        }},
      ]
    });
  }, [query, orgId, listAction]);

  // Load once on mount
  useEffect(() => {
    const fd = new FormData();
    listAction(fd);
  }, [listAction]);

  const items = listState?.items ?? [];

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Projects</h1>

      <form className="flex gap-2 items-end" action={listAction}>
        <div>
          <label className="block text-sm">Recherche</label>
          <input name="q" value={query} onChange={(e)=>setQuery(e.target.value)} className="border px-2 py-1" placeholder="Nom..."/>
        </div>
        <div>
          <label className="block text-sm">Organization ID</label>
          <input name="organizationId" value={orgId} onChange={(e)=>setOrgId(e.target.value)} className="border px-2 py-1" placeholder="org_..."/>
        </div>
        <button type="submit" className="border px-3 py-1">{listPending? 'Chargement...' : 'Filtrer'}</button>
      </form>

      <div className="overflow-auto">
        <table className="min-w-[600px] border" cellPadding={6}>
          <thead>
          <tr>
            <th className="border">Nom</th>
            <th className="border">Organisation</th>
            <th className="border">Description</th>
          </tr>
          </thead>
          <tbody>
          {items.length === 0 && (
            <tr><td className="border p-4" colSpan={3}>Aucun projet</td></tr>
          )}
          {items.map(p => (
            <tr key={p.id}>
              <td className="border">{p.name}</td>
              <td className="border">{p.organization?.name ?? p.organizationId}</td>
              <td className="border">{p.description ?? ''}</td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="p-3 border rounded">
          <h2 className="font-medium mb-2">Créer un projet</h2>
          <form action={createAction} onSubmit={()=>setShowCreate(false)} className="space-y-2">
            <div>
              <label className="block text-sm">Nom</label>
              <input name="name" required className="border px-2 py-1 w-full"/>
            </div>
            <div>
              <label className="block text-sm">Description</label>
              <input name="description" className="border px-2 py-1 w-full"/>
            </div>
            <div>
              <label className="block text-sm">Organization ID</label>
              <input name="organizationId" required className="border px-2 py-1 w-full"/>
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
          <p className="text-sm mb-2">Colonnes requises: <code>name,organizationId</code>. Optionnel: <code>description</code>.</p>
          <form action={importAction} onSubmit={()=>setShowImport(false)} className="space-y-2">
            <textarea name="csv" className="border w-full h-32" placeholder="name,description,organizationId\nSite Web,Refonte,org_123"/>
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
