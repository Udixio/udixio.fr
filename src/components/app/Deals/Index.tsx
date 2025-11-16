import React, {useEffect, useRef, useState} from "react";
import {withState} from '@astrojs/react/actions';
import {useActionState} from "react";
import {actions} from 'astro:actions';
import {appService} from "@/stores/appStore";

type Deal = {
  id: string;
  title: string;
  status: string;
  amount?: number | null;
  probability?: number | null;
  organizationId: string;
  projectId?: string | null;
  userId?: string | null;
  clientId?: string | null;
  organization?: { id: string; name: string };
  project?: { id: string; name: string } | null;
  user?: { id: string; name: string; email: string } | null;
  client?: { id: string; user: { id: string; name: string; email: string } } | null;
};

type ListState = { items: Deal[]; total: number } | undefined;

const listDeals = withState(actions.listDeals);
const createDeal = withState(actions.createDeal);
const importDealsCsv = withState(actions.importDealsCsv);

export default function DealsIndex() {
  const [filters, setFilters] = useState({ organizationId: "", projectId: "", clientId: "", userId: "", status: "" });
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  const [listState, listAction, listPending] = useActionState<ListState, FormData>(listDeals, undefined);
  const [createState, createAction, createPending] = useActionState<any, FormData>(createDeal, undefined);
  const [importState, importAction, importPending] = useActionState<any, FormData>(importDealsCsv, undefined);

  useEffect(() => {
    appService.set({
      actions: [
        {label: "Nouveau deal", action: () => setShowCreate(true)},
        {label: "Importer CSV", action: () => setShowImport(true)},
        {label: "Rafraîchir", action: () => {
          // Soumission directe du formulaire de filtre
          formRef.current?.requestSubmit();
        }},
      ]
    });
  }, [filters]);

  // Pas d'appel initial automatique: l'utilisateur soumet le formulaire

  const items = listState?.items ?? [];

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Deals</h1>

      <form ref={formRef} className="grid gap-2 grid-cols-2 md:grid-cols-6 items-end" action={listAction}
            onChange={(e)=>{
              const t = e.target as HTMLInputElement;
              if (!t.name) return;
              setFilters(prev=>({...prev, [t.name]: t.value}));
            }}>
        <div>
          <label className="block text-sm">Organization ID</label>
          <input name="organizationId" defaultValue={filters.organizationId} className="border px-2 py-1" placeholder="org_..."/>
        </div>
        <div>
          <label className="block text-sm">Project ID</label>
          <input name="projectId" defaultValue={filters.projectId} className="border px-2 py-1" placeholder="proj_..."/>
        </div>
        <div>
          <label className="block text-sm">Client ID</label>
          <input name="clientId" defaultValue={filters.clientId} className="border px-2 py-1" placeholder="client_..."/>
        </div>
        <div>
          <label className="block text-sm">User ID</label>
          <input name="userId" defaultValue={filters.userId} className="border px-2 py-1" placeholder="user_..."/>
        </div>
        <div>
          <label className="block text-sm">Statut</label>
          <select name="status" defaultValue={filters.status} className="border px-2 py-1">
            <option value="">—</option>
            <option value="LEAD">LEAD</option>
            <option value="QUALIFIED">QUALIFIED</option>
            <option value="PROPOSAL_SENT">PROPOSAL_SENT</option>
            <option value="WON">WON</option>
            <option value="LOST">LOST</option>
            <option value="ON_HOLD">ON_HOLD</option>
          </select>
        </div>
        <button type="submit" className="border px-3 py-1">{listPending? 'Chargement...' : 'Filtrer'}</button>
      </form>

      <div className="overflow-auto">
        <table className="min-w-[900px] border" cellPadding={6}>
          <thead>
          <tr>
            <th className="border">Titre</th>
            <th className="border">Organisation</th>
            <th className="border">Projet</th>
            <th className="border">Client</th>
            <th className="border">User (deprecated)</th>
            <th className="border">Statut</th>
            <th className="border">Montant</th>
            <th className="border">Prob.</th>
          </tr>
          </thead>
          <tbody>
          {items.length === 0 && (
            <tr><td className="border p-4" colSpan={8}>Aucun deal</td></tr>
          )}
          {items.map(d => (
            <tr key={d.id}>
              <td className="border">{d.title}</td>
              <td className="border">{d.organization?.name ?? d.organizationId}</td>
              <td className="border">{d.project?.name ?? (d.projectId || '')}</td>
              <td className="border">{d.client?.user?.name ?? d.client?.user?.email ?? (d.clientId || '')}</td>
              <td className="border">{d.user?.name ?? d.user?.email ?? (d.userId || '')}</td>
              <td className="border">{d.status}</td>
              <td className="border">{d.amount ?? ''}</td>
              <td className="border">{d.probability ?? ''}</td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="p-3 border rounded">
          <h2 className="font-medium mb-2">Créer un deal</h2>
          <form action={createAction} onSubmit={()=>setShowCreate(false)} className="grid gap-2 grid-cols-1 md:grid-cols-2">
            <div>
              <label className="block text-sm">Titre</label>
              <input name="title" required className="border px-2 py-1 w-full"/>
            </div>
            <div>
              <label className="block text-sm">Organization ID</label>
              <input name="organizationId" required className="border px-2 py-1 w-full"/>
            </div>
            <div>
              <label className="block text-sm">Project ID</label>
              <input name="projectId" className="border px-2 py-1 w-full"/>
            </div>
            <div>
              <label className="block text-sm">Client ID</label>
              <input name="clientId" className="border px-2 py-1 w-full"/>
            </div>
            <div>
              <label className="block text-sm">User ID (deprecated)</label>
              <input name="userId" className="border px-2 py-1 w-full"/>
            </div>
            <div>
              <label className="block text-sm">Montant</label>
              <input name="amount" type="number" step="0.01" className="border px-2 py-1 w-full"/>
            </div>
            <div>
              <label className="block text-sm">Probabilité</label>
              <input name="probability" type="number" min={0} max={100} className="border px-2 py-1 w-full"/>
            </div>
            <div>
              <label className="block text-sm">Statut</label>
              <select name="status" className="border px-2 py-1 w-full" defaultValue="LEAD">
                <option value="LEAD">LEAD</option>
                <option value="QUALIFIED">QUALIFIED</option>
                <option value="PROPOSAL_SENT">PROPOSAL_SENT</option>
                <option value="WON">WON</option>
                <option value="LOST">LOST</option>
                <option value="ON_HOLD">ON_HOLD</option>
              </select>
            </div>
            <div className="col-span-full flex gap-2 mt-2">
              <button type="submit" className="border px-3 py-1">{createPending? 'Création...' : 'Créer'}</button>
              <button type="button" className="border px-3 py-1" onClick={()=>setShowCreate(false)}>Annuler</button>
            </div>
          </form>
        </div>
      )}

      {showImport && (
        <div className="p-3 border rounded">
          <h2 className="font-medium mb-2">Importer CSV</h2>
          <p className="text-sm mb-2">Colonnes requises: <code>title,organizationId</code>. Optionnel: <code>projectId,clientId,userId,amount,probability,status</code>.</p>
          <form action={importAction} onSubmit={()=>setShowImport(false)} className="space-y-2">
            <textarea name="csv" className="border w-full h-32" placeholder="title,organizationId,projectId,clientId,userId,amount,probability,status\nRefonte site,org_123,proj_123,client_123,,10000,70,QUALIFIED"/>
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
