import React, {useActionState, useEffect, useState} from "react";
import {withState} from '@astrojs/react/actions';
import {actions} from 'astro:actions';
import {appService} from "@/stores/appStore";

type Audit = {
    id: string;
    type: string;
    status: string;
    runAt?: string | null;
    projectId: string;
    project?: { id: string; name: string };
};

type ListState = { items: Audit[]; total: number } | undefined;


export default function AuditsIndex() {
    const [filters, setFilters] = useState({projectId: "", status: "", type: ""});
    const [listState, listAction, listPending] = useActionState<ListState, FormData>(
        withState(actions.listAudits), undefined);

    useEffect(() => {
        appService.set({
            actions: [
                {
                    label: "Rafraîchir", action: () => {
                        const fd = new FormData();
                        Object.entries(filters).forEach(([k, v]) => {
                            if (v) fd.set(k, v as string);
                        });
                        listAction(fd);
                    }
                },
            ]
        });
    }, [filters, listAction]);

    useEffect(() => {
        const fd = new FormData();
        listAction(fd);
    }, [listAction]);

    const items = listState?.items ?? [];

    return (
        <div className="p-4 space-y-4">
            <h1 className="text-xl font-semibold">Audits</h1>

            <form className="grid gap-2 grid-cols-2 md:grid-cols-4 items-end" action={listAction}
                  onChange={(e) => {
                      const t = e.target as HTMLInputElement;
                      if (!t.name) return;
                      setFilters(prev => ({...prev, [t.name]: t.value}));
                  }}>
                <div>
                    <label className="block text-sm">Project ID</label>
                    <input name="projectId" defaultValue={filters.projectId} className="border px-2 py-1"
                           placeholder="proj_..."/>
                </div>
                <div>
                    <label className="block text-sm">Statut</label>
                    <select name="status" defaultValue={filters.status} className="border px-2 py-1">
                        <option value="">—</option>
                        <option value="DRAFT">DRAFT</option>
                        <option value="SCHEDULED">SCHEDULED</option>
                        <option value="RUNNING">RUNNING</option>
                        <option value="NEEDS_REVIEW">NEEDS_REVIEW</option>
                        <option value="PASSED">PASSED</option>
                        <option value="FAILED">FAILED</option>
                        <option value="ARCHIVED">ARCHIVED</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm">Type</label>
                    <select name="type" defaultValue={filters.type} className="border px-2 py-1">
                        <option value="">—</option>
                        <option value="LIGHTHOUSE">LIGHTHOUSE</option>
                        <option value="SEO">SEO</option>
                        <option value="PERFORMANCE">PERFORMANCE</option>
                        <option value="ACCESSIBILITY">ACCESSIBILITY</option>
                        <option value="SECURITY">SECURITY</option>
                        <option value="MANUAL">MANUAL</option>
                        <option value="OTHER">OTHER</option>
                    </select>
                </div>
                <button type="submit" className="border px-3 py-1">{listPending ? 'Chargement...' : 'Filtrer'}</button>
            </form>

            <div className="overflow-auto">
                <table className="min-w-[800px] border" cellPadding={6}>
                    <thead>
                    <tr>
                        <th className="border">Titre</th>
                        <th className="border">Projet</th>
                        <th className="border">Type</th>
                        <th className="border">Statut</th>
                        <th className="border">Run at</th>
                    </tr>
                    </thead>
                    <tbody>
                    {items.length === 0 && (
                        <tr>
                            <td className="border p-4" colSpan={5}>Aucun audit</td>
                        </tr>
                    )}
                    {items.map(a => (
                        <tr key={a.id}>
                            <td className="border">{a.id}</td>
                            <td className="border">{a.project?.name ?? a.projectId}</td>
                            <td className="border">{a.type}</td>
                            <td className="border">{a.status}</td>
                            <td className="border">{a.runAt ? new Date(a.runAt).toLocaleString() : ''}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
