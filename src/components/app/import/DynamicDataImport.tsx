import React, {useEffect, useMemo, useState} from 'react';
import {Card, ProgressIndicator} from "@udixio/ui-react";
import {useStore} from "@nanostores/react";
import {modelsService, modelsStore} from '@/stores/modelsStore.ts';
import {actions} from 'astro:actions';
import {getImportFields, type ImportField, unflattenToPrismaCreate} from '@/lib/modelUtils.ts';

type Props = {
    model: string;
    onCancel: () => void;
    onSuccess: (createdCount: number) => void;
};

type CsvRow = Record<string, string>;

function parseCSV(text: string): { headers: string[]; rows: CsvRow[] } {
    // Petit parser CSV qui gère les guillemets simples et doubles pour des cas standards
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0) return {headers: [], rows: []};
    const parseLine = (line: string): string[] => {
        const out: string[] = [];
        let cur = '';
        let inQuotes = false;
        let quoteChar = '"';
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if ((ch === '"' || ch === "'") && (!inQuotes)) {
                inQuotes = true;
                quoteChar = ch;
                continue;
            }
            if (inQuotes && ch === quoteChar) {
                // double quote escaping
                if (i + 1 < line.length && line[i + 1] === quoteChar) {
                    cur += quoteChar;
                    i++;
                    continue;
                }
                inQuotes = false;
                continue;
            }
            if (!inQuotes && ch === ',') {
                out.push(cur);
                cur = '';
                continue;
            }
            cur += ch;
        }
        out.push(cur);
        return out.map(s => s.trim());
    };
    const headers = parseLine(lines[0]);
    const rows: CsvRow[] = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = parseLine(lines[i]);
        const row: CsvRow = {};
        headers.forEach((h, idx) => row[h] = cols[idx] ?? '');
        rows.push(row);
    }
    return {headers, rows};
}

export default function DynamicDataImport({model, onCancel, onSuccess}: Props) {
    const {models} = useStore(modelsStore);
    const [fileName, setFileName] = useState<string | null>(null);
    const [headers, setHeaders] = useState<string[]>([]);
    const [rows, setRows] = useState<CsvRow[]>([]);
    const [mapping, setMapping] = useState<Record<string, string | ''>>({}); // expectedKey -> csvHeader
    const [progress, setProgress] = useState<{ total: number; done: number; errors: number }>({
        total: 0,
        done: 0,
        errors: 0
    });
    const [running, setRunning] = useState(false);

    useEffect(() => {
        if (!models) void modelsService.load();
    }, [models]);

    const expected: ImportField[] = useMemo(() => {
        const defs = models as any;
        if (!defs || !defs[model]) return [];
        try {
            return getImportFields(model, defs);
        } catch {
            return [];
        }
    }, [models, model]);

    useEffect(() => {
        // auto-map by exact header name
        const m: Record<string, string | ''> = {};
        for (const f of expected) {
            const hit = headers.find(h => h === f.key);
            m[f.key] = hit || '';
        }
        setMapping(m);
    }, [headers, expected]);

    function buildCsvTemplate(includeSample: boolean = true): string {
        const keys = expected.map(f => f.key);
        const escape = (v: string) => {
            const needs = /[",\n\r]/.test(v);
            const vv = v.replace(/"/g, '""');
            return needs ? `"${vv}"` : vv;
        };
        const headerLine = keys.map(escape).join(',');
        if (!includeSample) return headerLine + '\r\n';
        const sampleFor = (k: string): string => {
            const lk = k.toLowerCase();
            if (lk.endsWith('email')) return 'jean@test.com';
            if (lk.endsWith('id') || lk.includes('id')) return '123';
            if (lk.includes('date')) return '2025-01-01';
            if (lk.includes('phone') || lk.includes('tel')) return '+33600000000';
            if (lk.includes('name') || lk.includes('nom')) return 'Exemple';
            if (lk.includes('title') || lk.includes('label')) return 'Titre exemple';
            if (lk.includes('amount') || lk.includes('price') || lk.includes('montant')) return '1000';
            if (lk.includes('status') || lk.includes('etat')) return 'ACTIVE';
            return '';
        };
        const sampleLine = keys.map(k => escape(sampleFor(k))).join(',');
        return headerLine + '\r\n' + sampleLine + '\r\n';
    }

    function downloadTemplateCsv() {
        if (!expected || expected.length === 0) return;
        const csv = buildCsvTemplate(true);
        // Ajout d'un BOM UTF-8 pour Excel
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csv], {type: 'text/csv;charset=utf-8;'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fileModel = (model || 'template').toLowerCase();
        a.download = `template_import_${fileModel}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function onFileSelected(file: File) {
        const reader = new FileReader();
        reader.onload = () => {
            const text = String(reader.result || '');
            const parsed = parseCSV(text);
            setHeaders(parsed.headers);
            setRows(parsed.rows);
            setFileName(file.name);
        };
        reader.readAsText(file);
    }

    async function runImport() {
        if (!models || !rows.length) return;
        setRunning(true);
        const defs = models as any;
        const total = rows.length;
        setProgress({total, done: 0, errors: 0});

        const batchSize = 10;
        for (let i = 0; i < rows.length; i += batchSize) {
            const slice = rows.slice(i, i + batchSize);
            await Promise.all(slice.map(async (r) => {
                try {
                    // construire un objet plat { expectedKey: value }
                    const flat: Record<string, any> = {};
                    for (const f of expected) {
                        const csvCol = mapping[f.key];
                        if (!csvCol) continue; // champ non mappé
                        const raw = r[csvCol]; // déjà trim() via parseCSV
                        if (raw === undefined) continue;
                        // Règle stricte: chaînes vides => valeur absente (undefined) => ne pas setter la clé
                        if (raw === '') continue;
                        // Conserver tel quel ici (typage géré plus tard et par les defaults UI)
                        flat[f.key] = raw;
                    }
                    // ne pas garder de clés vides
                    Object.keys(flat).forEach(k => {
                        if (flat[k] === undefined || flat[k] === '') delete flat[k];
                    });
                    const nested = unflattenToPrismaCreate(model, flat, defs);
                    const {data} = await actions.createEntity({model: model as any, dataJson: JSON.stringify(nested)});
                    void data;
                    setProgress(prev => ({...prev, done: prev.done + 1}));
                } catch (e) {
                    console.error(e);
                    setProgress(prev => ({...prev, done: prev.done + 1, errors: prev.errors + 1}));
                }
            }));
        }
        setRunning(false);
        onSuccess(progress.total - progress.errors);
    }

    const firstRows = rows.slice(0, 5);
    const missingRequired = expected.filter(f => f.required && !mapping[f.key]);

    return (
        <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
                <h2 className="font-medium">Importer CSV — {model}</h2>
                <div className="flex gap-2">
                    <button className="border px-3 py-1"
                            onClick={downloadTemplateCsv}
                            disabled={expected.length === 0 || running}
                            title={expected.length === 0 ? 'Modèle indisponible: définitions non chargées' : 'Télécharger un gabarit CSV'}>
                        Télécharger le modèle
                    </button>
                    <button className="border px-3 py-1" onClick={onCancel} disabled={running}>Annuler</button>
                    <button className="border px-3 py-1"
                            disabled={running || rows.length === 0 || missingRequired.length > 0}
                            onClick={runImport}>{running ? 'Import…' : 'Importer'}</button>
                </div>
            </div>

            {/* Dropzone / input */}
            <div
                className="border border-dashed rounded p-4 text-center cursor-pointer bg-surface-container-low"
                onDragOver={(e) => {
                    e.preventDefault();
                }}
                onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer?.files?.[0];
                    if (f) onFileSelected(f);
                }}
            >
                <p className="text-sm mb-2">Glissez-déposez un fichier .csv ici ou</p>
                <label className="inline-block">
                    <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onFileSelected(f);
                    }}/>
                    <span className="border px-3 py-1 inline-block">Choisir un fichier…</span>
                </label>
                {fileName && <div className="text-xs mt-2 opacity-70">{fileName}</div>}
            </div>

            {/* Expected fields and mapping */}
            {expected.length > 0 && (
                <div className="mt-4">
                    <h3 className="font-medium mb-2">Champs attendus</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {expected.map((f) => {
                            const ok = headers.includes(mapping[f.key] as string);
                            return (
                                <div key={f.key}
                                     className={`flex items-center justify-between gap-2 border rounded px-2 py-1 ${ok || !mapping[f.key] ? '' : 'border-red-500'}`}>
                                    <div>
                                        <div className="text-sm">{f.label} <span
                                            className="opacity-60 text-xs">({f.key})</span> {f.required &&
                                            <span className="text-red-600">*</span>}</div>
                                    </div>
                                    <div className="min-w-[220px]">
                                        <select className="border px-2 py-1 w-full" value={mapping[f.key] ?? ''}
                                                onChange={(e) => setMapping(prev => ({
                                                    ...prev,
                                                    [f.key]: e.target.value
                                                }))}>
                                            <option value="">— Non mappé —</option>
                                            {headers.map((h) => (<option key={h} value={h}>{h}</option>))}
                                        </select>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {missingRequired.length > 0 && (
                        <div className="text-sm text-red-600 mt-2">Champs requis non
                            mappés: {missingRequired.map(f => f.key).join(', ')}</div>
                    )}
                </div>
            )}

            {/* Preview */}
            {rows.length > 0 && (
                <div className="mt-4">
                    <h3 className="font-medium mb-2">Aperçu (5 premières lignes)</h3>
                    <div className="overflow-auto">
                        <table className="min-w-[600px] border border-outline text-sm">
                            <thead>
                            <tr>
                                {headers.map(h => (
                                    <th key={h} className="border border-outline px-2 py-1 text-left">{h}</th>))}
                            </tr>
                            </thead>
                            <tbody>
                            {firstRows.map((r, idx) => (
                                <tr key={idx}>
                                    {headers.map(h => (
                                        <td key={h} className="border border-outline px-2 py-1">{r[h] ?? ''}</td>))}
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Progress */}
            {running && (
                <div className="mt-4">
                    <div className="flex items-center justify-between mb-1 text-sm">
                        <span>Importation… {progress.done}/{progress.total} (erreurs: {progress.errors})</span>
                    </div>
                    {/* @ts-ignore */}
                    <ProgressIndicator
                        progress={progress.total > 0 ? Math.round(progress.done / progress.total * 100) : 0}/>
                </div>
            )}
        </Card>
    );
}
