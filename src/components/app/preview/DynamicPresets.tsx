import React, {useEffect, useState} from 'react';

export type DynamicPreset = { label: string; filter: Record<string, any> };

type Props = {
  presets?: DynamicPreset[];
  onFilter: (filter?: Record<string, any>) => void;
};

export default function DynamicPresets({presets, onFilter}: Props) {
  const [idx, setIdx] = useState<number | ''>('');

  useEffect(() => {
    if (!Array.isArray(presets) || presets.length === 0) return;
    if (idx === '') {
      onFilter(undefined);
    } else {
      const f = presets[idx]?.filter;
      onFilter(f && Object.keys(f).length > 0 ? f : undefined);
    }
  }, [idx, presets]);

  if (!Array.isArray(presets) || presets.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-700">Vues rapides:</label>
      <select
        className="border px-2 py-1 rounded"
        value={idx as any}
        onChange={(e) => {
          const v = e.target.value;
          setIdx(v === '' ? '' : Number(v));
        }}
      >
        <option value="">— Aucune —</option>
        {presets.map((p, i) => (
          <option key={i} value={i}>{p.label}</option>
        ))}
      </select>
    </div>
  );
}
