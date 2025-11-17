import React, {useActionState, useEffect, useMemo, useRef, useState} from "react";
import {useFormik} from 'formik';
import {actions} from 'astro:actions';

type Props = {
    model: string;
    value?: Record<string, any>;
    onChange?: (value: Record<string, any>) => void;
    onSubmit?: (value: Record<string, any>) => Promise<any> | any;
    // Optionally filter fields
    include?: string[];
    exclude?: string[];
    disabledFields?: string[];
    className?: string;
    submitLabel?: string;
    hideSubmit?: boolean;
};

export default function DynamicModelForm({
                                             model,
                                             value,
                                             onChange,
                                             onSubmit,
                                             include,
                                             exclude,
                                             disabledFields,
                                             className,
                                             submitLabel = "Enregistrer",
                                             hideSubmit
                                         }: Props) {
    const [models, action, pending] = useActionState(
        actions.getModels,
        undefined, // initial likes and errors
    )

    useEffect(() => {
        action()
    }, []);


    const formRef = useRef<HTMLFormElement | null>(null);


    const [initial, setInitial] = useState<Record<string, any>>(value ?? {});
    useEffect(() => setInitial(value ?? {}), [value]);

    console.log(models);

    const fields = useMemo(() => {

        const defs = models?.data?.[model];
        console.log(defs);
        if (!defs) return [] as any[];
        let list = Object.entries(defs).map(([name, meta]) => ({
            name,
            ...(meta as any),
        }));
        // Garde uniquement les scalaires éditables
        list = list.filter((f: any) => !f.isId && !f.isReadOnly && !f.isList && (f.relationName == null));
        if (include?.length) list = list.filter(f => include!.includes(f.name));
        if (exclude?.length) list = list.filter(f => !exclude!.includes(f.name));
        return list;
    }, [models, include, exclude, pending]);

    // Build Formik
    const formik = useFormik({
        enableReinitialize: true,
        initialValues: initial,
        validate: (vals) => {
            const errors: Record<string, any> = {};
            for (const f of fields) {
                if (f.isRequired && (vals[f.name] === undefined || vals[f.name] === null || vals[f.name] === '')) {
                    errors[f.name] = 'Requis';
                }
            }
            return errors;
        },
        onSubmit: async (vals, helpers) => {
            // Normalize according to scalar types (numbers, booleans, dates, json)
            const normalized: Record<string, any> = {...vals};
            for (const f of fields) {
                const name = f.name as string;
                const t = String(f.type);
                const v = normalized[name];
                if (v === '' || v === undefined) {
                    continue;
                }
                if (t === 'Int' || t === 'BigInt') normalized[name] = Number.parseInt(String(v));
                if (t === 'Float' || t === 'Decimal') normalized[name] = Number.parseFloat(String(v));
                if (t === 'Boolean') normalized[name] = Boolean(v);
                if (t === 'DateTime') {
                    // Expecting value from input type=datetime-local (no timezone) -> build ISO
                    try {
                        normalized[name] = new Date(v).toISOString();
                    } catch {
                    }
                }
                if (t === 'Json' && typeof v === 'string') {
                    try {
                        normalized[name] = JSON.parse(v);
                    } catch { /* keep as string if invalid */
                    }
                }
            }
            try {
                await onSubmit?.(normalized);
                helpers.setSubmitting(false);
            } catch (e) {
                helpers.setSubmitting(false);
            }
        }
    });

    // Propagate changes externally if requested
    useEffect(() => {
        onChange?.(formik.values);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formik.values]);

    const renderField = (f: any) => {
        const name = f.name as string;
        const type = String(f.type);
        const disabled = !!disabledFields?.includes(name);
        const common = {
            name,
            disabled,
            className: "border px-2 py-1 w-full",
            value: (type === 'Boolean') ? undefined : (formik.values as any)[name] ?? '',
            onChange: formik.handleChange,
            onBlur: formik.handleBlur,
        } as any;
        if (type === 'String') return <input {...common} placeholder={name}/>;
        if (type === 'Int' || type === 'BigInt' || type === 'Float' || type === 'Decimal') return <input {...common}
                                                                                                         type="number"
                                                                                                         placeholder={name}/>;
        if (type === 'Boolean') {
            return (
                <div className="flex items-center gap-2">
                    <input type="checkbox" name={name} checked={!!(formik.values as any)[name]}
                           onChange={(e) => formik.setFieldValue(name, e.target.checked)} disabled={disabled}/>
                    <span className="text-sm">{name}</span>
                </div>
            );
        }
        if (type === 'DateTime') return <input {...common} type="datetime-local"/>;
        if (type === 'Json') return <textarea className="border w-full px-2 py-1 h-20" name={name}
                                              value={(formik.values as any)[name] ?? ''}
                                              onChange={(e) => formik.setFieldValue(name, e.target.value)}/>;
        // default to text input
        return <input {...common} placeholder={name}/>;
    };


    return (
        <form ref={formRef} className={className} onSubmit={formik.handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {fields.map((f: any) => (
                    <div key={f.name} className={(f.type === 'Json' ? 'md:col-span-2' : '') + ''}>
                        <label className="block text-sm mb-1">
                            {f.documentation || f.name}
                            {f.isRequired && <span className="text-red-500"> *</span>}
                        </label>
                        {renderField(f)}
                        {formik.touched[f.name] && (formik.errors as any)[f.name] && (
                            <div className="text-xs text-red-600 mt-1">{String((formik.errors as any)[f.name])}</div>
                        )}
                    </div>
                ))}
            </div>
            {!hideSubmit && (
                <div className="flex items-center justify-end gap-2 mt-3">
                    <button type="submit" className="border px-3 py-1 bg-black text-white disabled:opacity-50"
                            disabled={formik.isSubmitting}>
                        {formik.isSubmitting ? 'Envoi…' : submitLabel}
                    </button>
                </div>
            )}
        </form>
    );
}
