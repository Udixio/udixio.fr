import React, {useEffect, useMemo, useState} from 'react';

export type DynamicPreset = { label: string; filter: Record<string, any> };

type Props = {
  query: string;
  onSearch: (q: string, filter?: Record<string, any>) => void;
  presets?: DynamicPreset[];
};

function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function DynamicSearch({query, onSearch, presets}: Props) {
  const [text, setText] = useState(query ?? '');
  const [presetIdx, setPresetIdx] = useState<number | ''>('');
  const activeFilter = useMemo(() => {
    if (Array.isArray(presets) && presets.length && typeof presetIdx === 'number') {
      return presets[presetIdx]?.filter ?? undefined;
    }
    return undefined;
  }, [presets, presetIdx]);

  const debounced = useDebounced(text, 400);

  useEffect(() => {
    // Trigger on debounce
    onSearch(debounced, activeFilter);
  }, [debounced, activeFilter]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        className="border px-2 py-1 flex-1 min-w-[220px]"
        placeholder="Rechercher..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {Array.isArray(presets) && presets.length > 0 && (
        <select
          className="border px-2 py-1"
          value={presetIdx as any}
          onChange={(e) => {
            const v = e.target.value;
            setPresetIdx(v === '' ? '' : Number(v));
          }}
        >
          <option value="">— Aucun preset —</option>
          {presets.map((p, i) => (
            <option key={i} value={i}>{p.label}</option>
          ))}
        </select>
      )}
      <button
        className="border px-3 py-1"
        onClick={() => onSearch(text, activeFilter)}
      >
        Rechercher
      </button>
    </div>
  );
}
