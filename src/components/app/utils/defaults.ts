// Compute default scalar values based on field meta and provided initial values
export function computeDefaultValues(scalarFields: any[], provided?: Record<string, any>) {
  const base: Record<string, any> = { ...(provided ?? {}) };
  for (const f of scalarFields) {
    const name = f.name as string;
    if (base[name] !== undefined && base[name] !== null) continue;
    let d = f.ui?.default ?? f.default ?? undefined;
    const t = String(f.type);
    try {
      if (t === 'Boolean') base[name] = Boolean(d);
      else if (t === 'Int' || t === 'BigInt') base[name] = d === null || d === '' || d === undefined ? undefined : Number.parseInt(String(d));
      else if (t === 'Float' || t === 'Decimal') base[name] = d === null || d === '' || d === undefined ? undefined : Number.parseFloat(String(d));
      else if (t === 'DateTime') base[name] = typeof d === 'string' ? d : (d ? new Date(d as any).toISOString() : undefined);
      else if (t === 'Json') base[name] = typeof d === 'string' ? d : JSON.stringify(d, null, 2);
      else base[name] = d as any;
    } catch {
      base[name] = d as any;
    }
  }
  return base;
}
