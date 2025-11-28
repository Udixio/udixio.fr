import React, {useEffect, useMemo, useState} from 'react';
import DynamicSearch, {DynamicPreset} from './DynamicSearch';
import useDynamicList from './useDynamicList';
import {actions} from 'astro:actions';

type ModelField = {
  type: string;
  isId?: boolean;
  isList?: boolean;
  ui?: { preview?: boolean; label?: string | null; order?: number };
};

type ModelDefinition = Record<string, ModelField>;

type Props = {
  model: string;
  presets?: DynamicPreset[];
  pageSize?: number;
};

const SCALARS = new Set([
  'String', 'Int', 'Boolean', 'Float', 'BigInt', 'Decimal', 'Bytes', 'DateTime', 'Json'
]);

function isScalar(t?: string) {
  if (!t) return false;
  return SCALARS.has(String(t));
}

export default function DynamicDatatable({model, presets, pageSize = 25}: Props) {
  const [defs, setDefs] = useState<ModelDefinition | null>(null);
  const list = useDynamicList<any>(model, {limit: pageSize});

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await actions.server.getModels({models: [model]});
        const def = (res as any)?.[model] as ModelDefinition | undefined;
        if (alive) setDefs(def ?? {} as any);
      } catch (e) {
        console.error('[DynamicDatatable] getModels error', e);
        if (alive) setDefs({} as any);
      }
    })();
    return () => {
      alive = false;
    };
  }, [model]);

  const columns = useMemo(() => {
    const fields = defs ?? {};
    const entries = Object.entries(fields);
    if (entries.length === 0) return [] as { key: string; label: string; field: ModelField }[];

    const idFields = entries.filter(([, f]) => f.isId);
    const hasPreview = entries.some(([, f]) => f.ui?.preview === true);
    let chosen = entries.filter(([name, f]) => {
      if (hasPreview) return f.ui?.preview === true || f.isId;
      // keep scalar fields and id as fallback
      return f.isId || (isScalar(f.type) && !f.isList);
    });

    // sort by ui.order then name for stability
    chosen.sort((a, b) => {
      const ao = a[1].ui?.order ?? 9999;
      const bo = b[1].ui?.order ?? 9999;
      if (ao !== bo) return ao - bo;
      return a[0].localeCompare(b[0]);
    });

    // Ensure at least one id field exists
    if (!chosen.some(([, f]) => f.isId) && idFields.length > 0) {
      chosen = [idFields[0], ...chosen];
    }

    return chosen.map(([key, field]) => ({
      key,
      field,
      label: field.ui?.label ?? key,
    }));
  }, [defs]);

  const {items, total, loading, page} = list;
  const maxPage = Math.max(1, Math.ceil(total / list.limit));

  return (
    <div className="space-y-3">
      <DynamicSearch
        query={list.q}
        presets={presets}
        onSearch={(q, filter) => {
          list.setSearch(q);
          list.setFilter(filter ?? undefined);
        }}
      />

      <div className="overflow-auto">
        <table className="min-w-[720px] border" cellPadding={6}>
          <thead>
          <tr>
            {columns.map((c) => (
              <th className="border text-left" key={c.key}>{c.label}</th>
            ))}
          </tr>
          </thead>
          <tbody>
          {loading && (
            <tr>
              <td className="border p-3" colSpan={columns.length}>Chargement…</td>
            </tr>
          )}
          {!loading && items.length === 0 && (
            <tr>
              <td className="border p-3" colSpan={columns.length}>Aucun élément</td>
            </tr>
          )}
          {!loading && items.map((row: any) => (
            <tr key={row.id ?? JSON.stringify(row)}>
              {columns.map((c) => (
                <td className="border align-top" key={c.key}>{renderCell(row, c.key, c.field)}</td>
              ))}
            </tr>
          ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2">
        <button className="border px-3 py-1" disabled={page <= 1} onClick={list.prevPage}>Précédent</button>
        <span className="text-sm">Page {page} / {maxPage}</span>
        <button className="border px-3 py-1" disabled={page >= maxPage} onClick={list.nextPage}>Suivant</button>
        <span className="ml-auto text-sm text-gray-600">{total} total</span>
      </div>
    </div>
  );
}

function renderCell(row: any, key: string, field: ModelField) {
  const value = row?.[key];
  if (value == null) return '';

  if (isScalar(field.type) || typeof value !== 'object') {
    return String(value);
  }

  // Relation-like object: try to display readable properties
  if (typeof value === 'object') {
    const candidate = value?.name ?? value?.title ?? value?.email ?? value?.id;
    if (candidate != null) return String(candidate);
  }

  // if only id exists separately (e.g., organizationId)
  const idKey = key.endsWith('Id') ? key : `${key}Id`;
  if (row[idKey]) return String(row[idKey]);

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
