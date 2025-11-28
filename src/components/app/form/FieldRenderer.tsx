import React from "react";
// IconButton peut ne pas être présent selon la version du design system.
// S'il est disponible, on l'utilise pour l'action d'édition; sinon on garde un <button> simple.
// @ts-ignore
import {Button, Card, classnames, Divider, IconButton, Tab, Tabs, TextField} from "@udixio/ui-react";

type FieldRendererProps = {
    meta: any;
    formik?: any; // optionnel: si absent, fonctionne en mode standalone
    defs?: Record<string, any> | undefined;
    disabledFields?: string[];
    // Mode standalone (hors Formik)
    value?: any;
    onChange?: (e: any) => void;
    onBlur?: (e?: any) => void;
};

export function FieldRenderer({meta, formik, defs, disabledFields, value, onChange, onBlur}: FieldRendererProps) {
    const f = meta;
    const name = f.name as string;
    const type = String(f.type);
    const disabled = !!disabledFields?.includes(name);
    const label = (f.ui?.label || f.documentation || f.name) + (f.isRequired ? '*' : '');
    const hasFormik = !!formik;
    const modelsMap = defs || {};
    const isEnum = (defs as any)?.[type]?.['isEnum'];
    const isModelType = !!(modelsMap && (modelsMap as any)[type]) && !isEnum; // Relation potentielle

    const currentValue = hasFormik
        ? ((type === 'Boolean') ? undefined : (formik.values as any)[name] ?? '')
        : (type === 'Boolean' ? undefined : (value ?? ''));

    const handleChange = (e: any) => {
        if (hasFormik) {
            if (type === 'Boolean') {
                formik.setFieldValue(name, e?.target?.checked ?? !!e);
            } else if (typeof formik.setFieldValue === 'function') {
                // Autoriser setFieldValue(e) tel qu'utilisé ailleurs
                if (e && e.target !== undefined) {
                    formik.setFieldValue(name, e);
                } else {
                    formik.setFieldValue(name, e);
                }
            } else if (typeof formik.handleChange === 'function') {
                formik.handleChange(e);
            }
        } else if (onChange) {
            // Mode standalone: passer la valeur simple si possible
            const v = e && e.target !== undefined ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e;
            onChange(v);
        }
    };

    const handleBlur = (e: any) => {
        if (hasFormik && typeof formik.handleBlur === 'function') {
            formik.handleBlur(e);
        }
        if (onBlur) onBlur(e);
    };

    const common = {
        name,
        disabled,
        className: "",
        value: currentValue,
        onChange: handleChange,
        onBlur: handleBlur,
    } as any;
    const placeholder = f.ui?.placeholder || name;
    const description = f.ui?.description || f.documentation;
    const suffix = f.ui?.suffix;
    const prefix = f.ui?.prefix;
    const isNumber = type === 'Int' || type === 'BigInt' || type === 'Float' || type === 'Decimal';
    const fieldError = hasFormik && (formik.touched?.[name] && (formik.errors as any)?.[name]) ? String((formik.errors as any)[name]) : undefined;

    // Relations: si le type correspond à un modèle connu (et non un enum), on affiche un TextField simple (saisie d'un ID pour l'instant)
    if (isModelType) {
        return (
            <TextField
                {...common}
                variant="outlined"
                label={label}
                suffix={suffix}
                prefix={prefix}
                errorText={fieldError || null}
                supportingText={fieldError ? " " : description}
                placeholder={placeholder}
            />
        );
    }

    if (type === 'String' || isNumber) {
        return <TextField  {...common}
                           variant="outlined" label={label}
                           suffix={suffix} prefix={prefix}
                           errorText={fieldError || null} supportingText={fieldError ? " " : description}
                           placeholder={placeholder} {...(isNumber ? {type: 'number'} : {})}/>;
    }
    if (isEnum || type === 'Boolean' || type === 'DateTime' || type === 'Json') {
        (common as any).className += "border border-outline px-2 py-1 w-full";
        return <>
            <label className="block text-sm mb-1">
                {f.ui?.label || f.documentation || f.name}
                {f.isRequired && <span className="text-red-500"> *</span>}
            </label>
            {isEnum && (() => {
                const enumDef = (defs as any)?.[type];
                const values = Array.isArray(enumDef?.values) ? enumDef?.values : Object.values(enumDef?.values || {}).map((v: any) => v.name);
                return <select {...common} name={name} disabled={disabled}>
                    <option value="">Sélectionner...</option>
                    {values.map((val: any) => (
                        <option key={String(val)} value={String(val)}>{String(val)}</option>
                    ))}
                </select>
            })()}
            {type === 'Boolean' && (
                <div className="flex items-center gap-2">
                    <input type="checkbox" name={name} checked={!!(hasFormik ? (formik.values as any)[name] : value)}
                           onChange={(e) => handleChange(e)} disabled={disabled}/>
                    <span className="text-sm">{f.ui?.label || name}</span>
                </div>
            )}
            {type === 'DateTime' && <input {...common} type="datetime-local"/>}
            {type === 'Json' && (
                <textarea className="border w-full px-2 py-1 h-20" name={name}
                          value={hasFormik ? (formik.values as any)[name] ?? '' : (value ?? '')}
                          onChange={(e) => handleChange(e)}/>
            )}
            {hasFormik && formik.touched[f.name] && (formik.errors as any)[f.name] && (
                <div className="text-xs text-red-600 mt-1">{String((formik.errors as any)[f.name])}</div>
            )}
        </>;
    }
    console.error(`Unknown field type: ${type}`);
    return null;
}